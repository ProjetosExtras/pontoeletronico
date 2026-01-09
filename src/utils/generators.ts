import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to pad strings
const pad = (str: string | number, length: number, char: string = '0') => {
    return String(str).padStart(length, char);
};

// Helper to format CNPJ/CPF removing special chars
const cleanDoc = (doc: string) => doc.replace(/\D/g, '');

export const generateAFD = async () => {
    try {
        // Fetch Company Data
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
        if (!profile?.company_id) throw new Error("Empresa não encontrada");

        const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
        
        // Fetch Time Entries
        const { data: entries } = await supabase
            .from('time_entries')
            .select('*, employees(pis)')
            .eq('company_id', profile.company_id)
            .order('nsr', { ascending: true });

        if (!entries || entries.length === 0) throw new Error("Sem registros para gerar AFD");

        let content = "";
        let lineCounter = 0;

        // HEADER (Registro Tipo 1)
        // 000000001 (9) + Tipo (1) + CNPJ/CPF (14) + CEI (12) + Razão Social (150) + ...
        const header = `0000000011${pad(cleanDoc(company.cnpj), 14)}${pad('', 12)}${company.name.padEnd(150, ' ')}${pad(entries[0].nsr || 1, 9)}${pad(entries[entries.length - 1].nsr || entries.length, 9)}${format(new Date(), 'ddMMyyyyHHmm')}\n`;
        content += header;
        lineCounter++;

        // ENTRIES (Registro Tipo 3)
        // NSR (9) + Tipo (1) + Data (8) + Hora (4) + PIS (12) + ...
        for (const entry of entries) {
            const date = new Date(entry.timestamp);
            const nsr = pad(entry.nsr || 0, 9);
            const pis = pad(cleanDoc(entry.employees?.pis || '00000000000'), 12);
            const dateStr = format(date, 'ddMMyyyy');
            const timeStr = format(date, 'HHmm');
            
            // Simplified layout compliant with Portaria 671 (Conceptually)
            const line = `${nsr}3${dateStr}${timeStr}${pis}\n`;
            content += line;
            lineCounter++;
        }

        // TRAILER (Registro Tipo 9)
        const trailer = `9999999999${pad(lineCounter, 9)}${pad(entries.length, 9)}${pad(0, 9)}\n`;
        content += trailer;

        downloadFile(content, `AFD_${format(new Date(), 'yyyyMMdd')}.txt`);

    } catch (error: any) {
        console.error("Erro ao gerar AFD:", error);
        throw error;
    }
};

export const generateAEJ = async () => {
    // Placeholder implementation for AEJ
    // AEJ requires processed data (hours worked, overtime), which requires a calculation engine.
    // We will generate a basic structure.
    try {
        const content = "ARQUIVO AEJ - EM DESENVOLVIMENTO\nConsulte o suporte para detalhes de implementação completa.";
        downloadFile(content, `AEJ_${format(new Date(), 'yyyyMMdd')}.txt`);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
};

export const generateEspelhoPDF = async (employeeId?: string, referenceDate?: string) => {
    try {
         // Fetch Data
         const { data: { user } } = await supabase.auth.getUser();
         const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
         if (!profile?.company_id) throw new Error("Empresa não encontrada");
 
         const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
         
         // Calculate period
         let startPeriod, endPeriod;
         if (referenceDate) {
             const [year, month] = referenceDate.split('-').map(Number);
             startPeriod = startOfMonth(new Date(year, month - 1));
             endPeriod = endOfMonth(new Date(year, month - 1));
         } else {
             const today = new Date();
             startPeriod = startOfMonth(today);
             endPeriod = endOfMonth(today);
         }

         let query = supabase
             .from('time_entries')
             .select('*, employees(name, pis, code, cpf, admission_date, job_title)')
             .eq('company_id', profile.company_id)
             .gte('timestamp', startPeriod.toISOString())
             .lte('timestamp', endPeriod.toISOString())
             .order('timestamp', { ascending: true });

         if (employeeId && employeeId !== 'all') {
             query = query.eq('employee_id', employeeId);
         }

         const { data: entries } = await query;

        if (!entries || entries.length === 0) throw new Error("Sem dados para gerar o relatório neste período.");

        // Group by Employee
        const employeesMap = new Map();
        entries.forEach(entry => {
            const empName = entry.employees?.name || "Funcionário Desconhecido";
            if (!employeesMap.has(empName)) {
                employeesMap.set(empName, {
                    data: entry.employees || {},
                    entries: []
                });
            }
            employeesMap.get(empName).entries.push(entry);
        });

        const daysInMonth = eachDayOfInterval({ start: startPeriod, end: endPeriod });

        // Initialize PDF
        // @ts-ignore
        const doc = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();
        // const pdfHeight = doc.internal.pageSize.getHeight();
        
        let pageCount = 0;

        // Process each employee
        for (const [empName, empObj] of employeesMap) {
            if (pageCount > 0) {
                doc.addPage();
            }
            pageCount++;

            const empData = empObj.data;
            const empEntries = empObj.entries;

            // Info Rows Helper
            const renderInfoRow = (label: string, value: string) => `
                <div class="info-row">
                    <div class="info-label">${label}</div>
                    <div class="info-value">${value}</div>
                </div>
            `;

            const admission = empData.admission_date ? format(new Date(empData.admission_date), 'dd/MM/yyyy') : '-';
             const jobTitle = empData.job_title ? empData.job_title.toUpperCase() : 'FUNCIONÁRIO';

            // Build HTML for this employee
            const container = document.createElement('div');
            container.style.width = '210mm';
            container.style.padding = '10mm';
            container.style.backgroundColor = 'white';
            container.style.color = 'black';
            container.style.position = 'absolute';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            
            // Inline Styles for html2canvas
            const styles = `
                <style>
                    .wrapper { font-family: 'Arial', sans-serif; font-size: 10px; color: #000; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                    th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }
                    .header-section { display: flex; gap: 20px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .info-left { flex: 2; }
                    .info-right { flex: 1; }
                    .info-row { display: flex; border-bottom: 1px solid #ddd; }
                    .info-label { width: 120px; background-color: #f0f0f0; padding: 2px 5px; font-weight: bold; border-right: 1px solid #ddd; display: flex; align-items: center; }
                    .info-value { flex: 1; padding: 2px 5px; display: flex; align-items: center; }
                    .section-title { font-weight: bold; background-color: #e0e0e0; padding: 5px; border: 1px solid #ccc; text-align: center; }
                    .main-table th { background-color: #333; color: white; text-align: center; font-size: 9px; padding: 6px 2px; }
                    .main-table td { text-align: center; font-size: 10px; height: 16px; padding: 2px; }
                    .row-day { background-color: #fff; text-align: left !important; padding-left: 8px !important; font-weight: normal; font-family: 'Courier New', monospace; }
                    .weekend { background-color: #f5f5f5; }
                    .totals-row td { background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #000; }
                    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .signature-line { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px; font-size: 11px; }
                </style>
            `;

            let html = `
                <div class="wrapper">
                <div class="header-section">
                    <div class="info-left">
                        ${renderInfoRow("Empresa", company.name.toUpperCase())}
                        ${renderInfoRow("CNPJ", company.cnpj)}
                        ${renderInfoRow("Inscrição Est.", company.state_registration || "ISENTO")} 
                        ${renderInfoRow("Nome", `<strong style="font-size: 12px;">${empName.toUpperCase()}</strong>`)}
                        <div class="info-row">
                            <div class="info-label">Nº Folha</div>
                            <div class="info-value">001</div>
                            <div class="info-label" style="width: 50px;">CPF</div>
                            <div class="info-value">${empData.cpf || '000.000.000-00'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">CTPS</div>
                            <div class="info-value"> - </div>
                            <div class="info-label" style="width: 70px;">Admissão</div>
                            <div class="info-value">${admission}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Função</div>
                            <div class="info-value">${jobTitle}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label" style="border-bottom: none;">Departamento</div>
                            <div class="info-value" style="border-bottom: none;">GERAL</div>
                        </div>
                    </div>
                    <div class="info-right">
                        <div class="section-title">Horário de Trabalho</div>
                        <table style="font-size: 9px; margin-top: 5px;">
                            <tr style="background: #f0f0f0;"><th></th><th>ENT 1</th><th>SAI 1</th><th>ENT 2</th><th>SAI 2</th></tr>
                            <tr><td>SEG</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>
                            <tr><td>TER</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>
                            <tr><td>QUA</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>
                            <tr><td>QUI</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>
                            <tr><td>SEX</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>
                        </table>
                    </div>
                </div>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th style="width: 140px; text-align: left; padding-left: 10px;">DIA</th>
                            <th>ENT. 1</th>
                            <th>SAÍ. 1</th>
                            <th>ENT. 2</th>
                            <th>SAÍ. 2</th>
                            <th>NORMAIS</th>
                            <th>FALTAS</th>
                            <th>EXTRAS</th>
                            <th>OBS</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            let totalNormais = 0;
            let totalFaltas = 0;
            let totalExtras = 0;

            daysInMonth.forEach(day => {
                const dayStr = format(day, 'dd/MM/yy - iii', { locale: ptBR });
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                const rowClass = isWeekend ? 'weekend' : '';
                
                const dayEntries = empEntries.filter((e: any) => isSameDay(new Date(e.timestamp), day));
                dayEntries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                const fmt = (e: any) => e ? format(new Date(e.timestamp), 'HH:mm') : '';
                const entrada1 = dayEntries.find((e: any) => e.type === 'entrada') || dayEntries[0];
                const saida1 = dayEntries.find((e: any) => e.type === 'intervalo') || dayEntries[1];
                const entrada2 = dayEntries.find((e: any) => e.type === 'retorno') || dayEntries[2];
                const saida2 = dayEntries.find((e: any) => e.type === 'saida') || dayEntries[3];

                const t1 = fmt(entrada1);
                const t2 = fmt(saida1);
                const t3 = fmt(entrada2);
                const t4 = fmt(saida2);

                let normais = '';
                let faltas = '';
                let extras = '';
                
                const isPast = day < new Date();
                
                if (!isWeekend && dayEntries.length === 0 && isPast) {
                    faltas = '08:00';
                    totalFaltas += 480;
                } else if (!isWeekend && dayEntries.length >= 2) {
                    normais = '08:00';
                    totalNormais += 480;
                }

                html += `
                    <tr class="${rowClass}">
                        <td class="row-day">${dayStr}</td>
                        <td>${t1}</td>
                        <td>${t2}</td>
                        <td>${t3}</td>
                        <td>${t4}</td>
                        <td>${normais}</td>
                        <td>${faltas}</td>
                        <td>${extras}</td>
                        <td></td>
                    </tr>
                `;
            });

            const formatMinutes = (mins: number) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return `${pad(h, 2)}:${pad(m, 2)}`;
            };

            html += `
                    <tr class="totals-row">
                        <td colspan="5" style="text-align: right; padding-right: 10px;">TOTAIS</td>
                        <td>${formatMinutes(totalNormais)}</td>
                        <td>${formatMinutes(totalFaltas)}</td>
                        <td>${formatMinutes(totalExtras)}</td>
                        <td></td>
                    </tr>
                    </tbody>
                </table>

                <div style="font-size: 9px; margin-bottom: 30px; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 5px;">
                    (*) - Batida lançada manualmente &nbsp;&nbsp; (^) - Pré Assinalado
                </div>
                <div class="footer">
                    <div class="signature-line">
                        ${empName.toUpperCase()}<br>
                        FUNCIONÁRIO
                    </div>
                    <div class="signature-line">
                        GESTOR RESPONSÁVEL<br>
                        WALERIA REZENDE
                    </div>
                </div>
                </div>
            `;

            container.innerHTML = styles + html;
            document.body.appendChild(container);

            try {
                const canvas = await html2canvas(container, {
                    scale: 2, // Higher quality
                    useCORS: true,
                    logging: false
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                
                doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            } finally {
                document.body.removeChild(container);
            }
        }

        doc.save(`Espelho_Ponto_${format(new Date(), 'yyyy-MM')}.pdf`);

    } catch (error: any) {
        console.error("Erro ao gerar PDF:", error);
        throw error;
    }
};
