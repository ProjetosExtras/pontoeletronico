import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, differenceInCalendarDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to pad strings
const pad = (str: string | number, length: number, char: string = '0') => {
    return String(str).padStart(length, char);
};

// Helper to format CNPJ/CPF removing special chars
const cleanDoc = (doc: string) => doc.replace(/\D/g, '');

type EmployeeRow = {
    name?: string | null;
    pis?: string | null;
    code?: string | null;
    cpf?: string | null;
    admission_date?: string | null;
    job_title?: string | null;
    shift_type?: string | null;
};

type TimeEntryRow = {
    id: string; // Added ID for consumption tracking
    timestamp: string;
    type?: string | null;
    nsr?: number | null;
    employee_id?: string | null;
    employees?: EmployeeRow | null;
    is_manual?: boolean | null;
};

export const generateAFD = async () => {
    try {
        // Fetch Company Data
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
        if (!profile?.company_id) throw new Error("Empresa não encontrada");

        const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
        
        // Fetch Time Entries
        const { data: entriesRaw } = await supabase
            .from('time_entries')
            .select('*, employees(pis)')
            .eq('company_id', profile.company_id)
            .order('nsr', { ascending: true });

        const entries = (entriesRaw as unknown as TimeEntryRow[] | null) || [];
        if (entries.length === 0) throw new Error("Sem registros para gerar AFD");

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

    } catch (error: unknown) {
        console.error("Erro ao gerar AFD:", error);
        throw error;
    }
};

export const generateAEJ = async () => {
    try {
        // Fetch Company Data
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
        if (!profile?.company_id) throw new Error("Empresa não encontrada");

        const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
        
        // Fetch Time Entries for Current Month
        const today = new Date();
        const startPeriod = startOfMonth(today);
        const endPeriod = endOfMonth(today);

        const { data: entriesRaw } = await supabase
            .from('time_entries')
            .select('*, employees(name, pis, code, cpf, admission_date, shift_type)')
            .eq('company_id', profile.company_id)
            .gte('timestamp', startPeriod.toISOString())
            .lte('timestamp', endPeriod.toISOString())
            .order('timestamp', { ascending: true });

        const entries = (entriesRaw as unknown as TimeEntryRow[] | null) || [];
        if (entries.length === 0) throw new Error("Sem registros para gerar AEJ");

        // Group by Employee
        const employeesMap = new Map();
        entries.forEach((entry) => {
            const empName = entry.employees?.name || "Funcionário Desconhecido";
            if (!employeesMap.has(empName)) {
                employeesMap.set(empName, {
                    data: entry.employees || {},
                    entries: []
                });
            }
            employeesMap.get(empName).entries.push(entry);
        });

        let content = "";
        let lineCounter = 1;

        // HEADER (Registro Tipo 1) - Simplified
        // 000000001 + CNPJ + DataGeracao
        const header = `000000001${pad(cleanDoc(company.cnpj), 14)}${format(new Date(), 'ddMMyyyyHHmm')}\n`;
        content += header;
        lineCounter++;

        const daysInMonth = eachDayOfInterval({ start: startPeriod, end: endPeriod });

        // Process each employee
        for (const [empName, empObj] of employeesMap) {
            const empData = empObj.data;
            const empEntries = empObj.entries as TimeEntryRow[];

            // Employee Header (Registro Tipo 2 - Fictional for structure)
            // 000000002 + CPF + PIS + Nome
            content += `000000002${pad(cleanDoc(empData.cpf || ''), 11)}${pad(cleanDoc(empData.pis || ''), 11)}${empName.substring(0, 150).padEnd(150, ' ')}\n`;
            lineCounter++;

            // Process Days Logic (Reused from Espelho)
            const entriesByDay = new Map<string, TimeEntryRow[]>();
            empEntries.forEach((e: TimeEntryRow) => {
                const d = new Date(e.timestamp);
                const key = format(d, 'yyyy-MM-dd');
                if (!entriesByDay.has(key)) entriesByDay.set(key, []);
                entriesByDay.get(key)!.push(e);
            });

            entriesByDay.forEach((arr) => {
                arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            });

            // Determine Shift Type
            const workedDayKeys = Array.from(entriesByDay.keys()).sort();
            const workedDaysCount = workedDayKeys.length;
            const longShiftDaysCount = workedDayKeys.reduce((acc, key) => {
                const arr = entriesByDay.get(key) || [];
                if (arr.length < 2) return acc;
                const first = new Date(arr[0].timestamp);
                const last = new Date(arr[arr.length - 1].timestamp);
                const spanMins = Math.max(0, Math.round((last.getTime() - first.getTime()) / 60000));
                return spanMins >= 600 ? acc + 1 : acc;
            }, 0);

            let is12x36 = false;
            if (empData.shift_type) {
                is12x36 = empData.shift_type === '12x36';
            } else {
                is12x36 = workedDaysCount >= 3 && longShiftDaysCount >= 3 && longShiftDaysCount / workedDaysCount >= 0.5;
            }

            const hasSaturdayWork = workedDayKeys.some((key) => {
                const d = new Date(`${key}T00:00:00`);
                return getDay(d) === 6;
            });

            const anchorKey = workedDayKeys[0];
            const anchorDay = anchorKey ? new Date(`${anchorKey}T00:00:00`) : new Date(startPeriod);

            // Generate Day Records
            daysInMonth.forEach(day => {
                const dayStr = format(day, 'ddMMyyyy');
                const dow = getDay(day);
                const key = format(day, 'yyyy-MM-dd');
                const dayEntries = entriesByDay.get(key) || [];
                
                // Calculate Hours
                const isSaturdayAlternating = ['2', '3'].includes(String(empData.code || ''));
                const expectedStart = is12x36 ? '07:00' : '08:00';
                
                let expectedMinutes = 0;
                if (is12x36) {
                    expectedMinutes = differenceInCalendarDays(day, anchorDay) % 2 === 0 ? 660 : 0;
                } else {
                    if (dow === 0) {
                        expectedMinutes = 0;
                    } else if (dow === 6) {
                        if (isSaturdayAlternating) {
                             // Regra para IDs 2 e 3: Sábado sim/não.
                             // Se tiver marcação, considera 8h (480min). Se não, folga (0min).
                             expectedMinutes = dayEntries.length > 0 ? 480 : 0;
                        } else {
                            expectedMinutes = hasSaturdayWork ? 240 : 0;
                        }
                    } else {
                        expectedMinutes = 480;
                    }
                }
                const shouldWork = expectedMinutes > 0;

                const entrada1 = dayEntries.find((e: any) => e.type === 'entrada') || dayEntries[0];
                const saida2 = dayEntries.find((e: any) => e.type === 'saida') || dayEntries[dayEntries.length - 1];
                const saida1 = dayEntries.find((e: any) => e.type === 'intervalo') || dayEntries[1];
                const entrada2 = dayEntries.find((e: any) => e.type === 'retorno') || dayEntries[2];

                let workedMinutes = 0;
                if (entrada1 && saida2) {
                    const start = new Date(entrada1.timestamp);
                    const end = new Date(saida2.timestamp);
                    const presence = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                    let breakMinutes = 0;
                    if (saida1 && entrada2) {
                        const b1 = new Date(saida1.timestamp);
                        const b2 = new Date(entrada2.timestamp);
                        breakMinutes = Math.max(0, Math.round((b2.getTime() - b1.getTime()) / 60000));
                    }
                    workedMinutes = Math.max(0, presence - breakMinutes);
                }

                const normaisMinutes = shouldWork ? Math.min(workedMinutes, expectedMinutes) : 0;
                const todayStart = new Date();
                todayStart.setHours(0,0,0,0);
                const isPast = day.getTime() < todayStart.getTime();
                const faltasMinutes = (shouldWork && isPast) ? Math.max(0, expectedMinutes - workedMinutes) : 0;
                const extrasMinutes = shouldWork ? Math.max(0, workedMinutes - expectedMinutes) : workedMinutes;

                // Day Record (Registro Tipo 3 - Fictional for structure)
                // 000000003 + Data + Normais + Extras + Faltas
                if (shouldWork || workedMinutes > 0) {
                     const line = `000000003${dayStr}${pad(normaisMinutes, 4)}${pad(extrasMinutes, 4)}${pad(faltasMinutes, 4)}\n`;
                     content += line;
                     lineCounter++;
                }
            });
        }

        // TRAILER
        const trailer = `999999999${pad(lineCounter, 9)}${pad(entries.length, 9)}\n`;
        content += trailer;

        downloadFile(content, `AEJ_${format(new Date(), 'yyyyMMdd')}.txt`);

    } catch (error) {
        console.error("Erro ao gerar AEJ:", error);
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

export const generateEspelhoPDF = async (employeeId?: string, referenceDate?: string, shiftTypeOverride?: string) => {
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
             .select('*, employees(name, pis, code, cpf, admission_date, job_title, shift_type)')
             .eq('company_id', profile.company_id)
             .gte('timestamp', startPeriod.toISOString())
             .lte('timestamp', endPeriod.toISOString())
             .order('timestamp', { ascending: true });

         if (employeeId && employeeId !== 'all') {
             query = query.eq('employee_id', employeeId);
         }

         const { data: entriesRaw } = await query;
         const entries = (entriesRaw as unknown as TimeEntryRow[] | null) || [];

        if (entries.length === 0) throw new Error("Sem dados para gerar o relatório neste período.");

        // Group by Employee
        const employeesMap = new Map();
        entries.forEach((entry) => {
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
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Initialize PDF
        // @ts-ignore
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
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
            const empEntries = empObj.entries as TimeEntryRow[];
            const empCode = String(empData.code || '').trim();
            const isId3 = empCode === '3';
            const isId2 = empCode === '2';
            const isId30 = empCode === '30';
            const isId21 = empCode === '21';
            const isSaturdayMorning = empCode === '6';
            const isSaturdayAlternating = isId2 || isId3;

            const entriesByDay = new Map<string, TimeEntryRow[]>();
            empEntries.forEach((e: TimeEntryRow) => {
                const d = new Date(e.timestamp);
                const key = format(d, 'yyyy-MM-dd');
                if (!entriesByDay.has(key)) entriesByDay.set(key, []);
                entriesByDay.get(key)!.push(e);
            });

            entriesByDay.forEach((arr) => {
                arr.sort((a: TimeEntryRow, b: TimeEntryRow) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            });

            const workedDayKeys = Array.from(entriesByDay.keys()).sort();
            const workedDaysCount = workedDayKeys.length;
            const longShiftDaysCount = workedDayKeys.reduce((acc, key) => {
                const arr = entriesByDay.get(key) || [];
                if (arr.length < 2) return acc;
                const first = new Date(arr[0].timestamp);
                const last = new Date(arr[arr.length - 1].timestamp);
                const spanMins = Math.max(0, Math.round((last.getTime() - first.getTime()) / 60000));
                return spanMins >= 600 ? acc + 1 : acc;
            }, 0);

            // Determine Shift Type
            let is12x36 = false;
            let isNightShift = false;
            let is3hMorning = false;
            let isStandard0918 = false;

            if (shiftTypeOverride && shiftTypeOverride !== 'auto') {
                if (shiftTypeOverride === '12x36') {
                    is12x36 = true;
                    isNightShift = false;
                } else if (shiftTypeOverride === '12x36_noturno') {
                    is12x36 = true;
                    isNightShift = true;
                } else if (shiftTypeOverride === '3h_diurno') {
                    is3hMorning = true;
                } else if (shiftTypeOverride === 'standard_09_18') {
                    isStandard0918 = true;
                } else if (shiftTypeOverride === 'standard') {
                    is12x36 = false;
                    isNightShift = false;
                }
            } else if (empData.shift_type) {
                is12x36 = empData.shift_type === '12x36' || empData.shift_type === '12x36_noturno';
                isNightShift = empData.shift_type === '12x36_noturno';
                is3hMorning = empData.shift_type === '3h_diurno';
                isStandard0918 = empData.shift_type === 'standard_09_18';
            } else {
                // Heuristic fallback
                is12x36 = workedDaysCount >= 3 && longShiftDaysCount >= 3 && longShiftDaysCount / workedDaysCount >= 0.5;
            }

            // FORCE ID 30 TO BE 12x36 - REMOVED, using DB shift_type


            const hasSaturdayWork = workedDayKeys.some((key) => {
                const d = new Date(`${key}T00:00:00`);
                return getDay(d) === 6;
            });

            const anchorKey = workedDayKeys[0];
            let anchorDay = anchorKey ? new Date(`${anchorKey}T00:00:00`) : new Date(startPeriod);

            // FIX: Use admission date as stable anchor for 12x36 shifts to prevent phase inversion
            // when employee misses the first shift of the month.
            if ((is12x36 || is3hMorning) && empData.admission_date) {
                const admStr = String(empData.admission_date).split('T')[0];
                anchorDay = new Date(`${admStr}T00:00:00`);
            }

            const consumedEntryIds = new Set<string>();

            // Info Rows Helper
            const renderInfoRow = (label: string, value: string) => `
                <div class="info-row">
                    <div class="info-label">${label}</div>
                    <div class="info-value">${value}</div>
                </div>
            `;

            const admission = empData.admission_date ? String(empData.admission_date).split('T')[0].split('-').reverse().join('/') : '-';
            const jobTitle = empData.job_title ? empData.job_title.toUpperCase() : 'FUNCIONÁRIO';
            
            // Calculate sheet number based on month
            const sheetNumber = pad(startPeriod.getMonth() + 1, 3);

            const scheduleLabel = is12x36 
                ? (isNightShift ? '12X36 NOTURNO (19:00-07:00)' : '12X36 (07:00-19:00)') 
                : (is3hMorning ? '3H DIURNO' : (isStandard0918 || isId3 ? 'PADRÃO (SEG-SEX 09:00-18:00, SAB 08:00-17:00)' : 'NORMAL'));
            
            let scheduleRows = '';
            if (is12x36) {
                 scheduleRows = isNightShift 
                 ? `<tr><td>ESC</td><td>19:00</td><td>00:00</td><td>01:00</td><td>07:00</td></tr>`
                 : `<tr><td>ESC</td><td>07:00</td><td>12:00</td><td>13:00</td><td>19:00</td></tr>`;
            } else if (is3hMorning) {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>TER</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>QUA</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>QUI</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>SEX</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    ...(hasSaturdayWork ? [
                        `<tr><td>SAB</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`
                    ] : [])
                 ].join('');
            } else if (isStandard0918 || isId3) {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>09:00</td><td>13:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>TER</td><td>09:00</td><td>13:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>QUA</td><td>09:00</td><td>13:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>QUI</td><td>09:00</td><td>13:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>SEX</td><td>09:00</td><td>13:00</td><td>14:00</td><td>18:00</td></tr>`,
                    ...(hasSaturdayWork ? [
                        `<tr><td>SAB</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>`
                    ] : [])
                 ].join('');
            } else {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>`,
                    `<tr><td>TER</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>`,
                    `<tr><td>QUA</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>`,
                    `<tr><td>QUI</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>`,
                    `<tr><td>SEX</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>`,
                    ...(hasSaturdayWork || isSaturdayMorning ? [
                        isSaturdayAlternating
                        ? `<tr><td>SAB</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td></tr>`
                        : `<tr><td>SAB</td><td>08:00</td><td>12:00</td><td> - </td><td>12:00</td></tr>`
                    ] : []),
                ].join('');
            }

            // Build HTML for this employee
            const container = document.createElement('div');
            container.style.width = '210mm';
            container.style.boxSizing = 'border-box';
            container.style.padding = '10mm';
            container.style.backgroundColor = 'white';
            container.style.color = 'black';
            container.style.position = 'absolute';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            
            // Inline Styles for html2canvas
            const styles = `
                <style>
                    .wrapper { font-family: 'Arial', sans-serif; font-size: 9px; color: #000; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 5px; table-layout: fixed; }
                    th, td { border: 1px solid #ccc; padding: 2px 3px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; }
                    .header-section { display: flex; gap: 15px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    .info-left { flex: 2; }
                    .info-right { flex: 1; }
                    .info-row { display: flex; border-bottom: 1px solid #ddd; }
                    .info-label { width: 100px; background-color: #f0f0f0; padding: 1px 4px; font-weight: bold; border-right: 1px solid #ddd; display: flex; align-items: center; font-size: 9px; }
                    .info-value { flex: 1; padding: 1px 4px; display: flex; align-items: center; font-size: 9px; }
                    .section-title { font-weight: bold; background-color: #e0e0e0; padding: 3px; border: 1px solid #ccc; text-align: center; font-size: 10px; }
                    .main-table th { background-color: #333; color: white; text-align: center; font-size: 8px; padding: 4px 2px; }
                    .main-table td { text-align: center; font-size: 8px; height: 14px; padding: 2px; }
                    .row-day { background-color: #fff; text-align: left !important; padding-left: 5px !important; font-weight: normal; font-family: 'Courier New', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .weekend { background-color: #f5f5f5; }
                    .totals-row td { background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #000; }
                    .footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .signature-line { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px; font-size: 10px; }
                </style>
            `;

            let html = `
                <div class="wrapper">
                <div class="header-section">
                    <div class="info-left">
                        ${renderInfoRow("Empresa", company.name.toUpperCase())}
                        ${renderInfoRow("CNPJ", company.cnpj)}
                        ${renderInfoRow("Inscrição Est.", company.state_registration || "ISENTO")} 
                        ${renderInfoRow("Período", `${format(startPeriod, 'dd/MM/yyyy')} a ${format(endPeriod, 'dd/MM/yyyy')}`)}
                        ${renderInfoRow("Nome", `<strong style="font-size: 12px;">${empName.toUpperCase()}</strong>`)}
                        <div class="info-row">
                            <div class="info-label">Nº Folha</div>
                            <div class="info-value">${sheetNumber}</div>
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
                        <div class="section-title">Horário de Trabalho (${scheduleLabel})</div>
                        <table style="font-size: 9px; margin-top: 5px;">
                            <tr style="background: #f0f0f0;"><th></th><th>ENT 1</th><th>SAI 1</th><th>ENT 2</th><th>SAI 2</th></tr>
                            ${scheduleRows}
                        </table>
                    </div>
                </div>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th width="15%">DATA</th>
                            <th width="7%">ENT. 1</th>
                            <th width="7%">SAÍ. 1</th>
                            <th width="7%">ENT. 2</th>
                            <th width="7%">SAÍ. 2</th>
                            <th width="9%">NORMAIS</th>
                            <th width="9%">FALTAS</th>
                            <th width="9%">EXTRAS</th>
                            <th width="9%">AD. NOT</th>
                            <th width="21%">OBS</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            let totalNormais = 0;
            let totalFaltas = 0;
            let totalExtras = 0;
            let totalAtrasos = 0;
            let totalAdicionalNoturno = 0;

            const calculateNightMinutes = (start: Date, end: Date): number => {
                let minutes = 0;
                const current = new Date(start.getTime());
                const endTime = end.getTime();
                
                while (current.getTime() < endTime) {
                    const h = current.getHours();
                    if (h >= 22 || h < 5) {
                        minutes++;
                    }
                    current.setMinutes(current.getMinutes() + 1);
                }
                return minutes;
            };

            daysInMonth.forEach(day => {
                const dayStr = format(day, 'dd/MM/yy - iii', { locale: ptBR });
                const dow = getDay(day);
                const key = format(day, 'yyyy-MM-dd');
                
                // Get entries and filter consumed ones
                let dayEntries = entriesByDay.get(key) || [];
                dayEntries = dayEntries.filter(e => !consumedEntryIds.has(e.id));
                
                const hasAnyEntry = dayEntries.length > 0;
                const isPast = day.getTime() < todayStart.getTime();

                // Calculate Hours
                const empCode = String(empData.code || '');
                const isId3 = empCode === '3';
                const isId2 = empCode === '2';
                const isSaturdayAlternating = isId2 || isId3;
                const isSaturdayMorning = empCode === '6';

                let expectedStart = '08:00';
                if (is12x36) {
                    expectedStart = isNightShift ? '19:00' : '07:00';
                } else if (isStandard0918 || isId3) {
                    if (dow === 6 && isSaturdayAlternating && dayEntries.length > 0) {
                        expectedStart = '08:00';
                    } else {
                        expectedStart = '09:00';
                    }
                }
                
                let expectedMinutes = 0;
                if (isId21) {
                    // ID 21: Mon-Thu (480), Fri (240), Sat (480), Sun (0)
                    if (dow >= 1 && dow <= 4) expectedMinutes = 480; // Seg-Qui
                    else if (dow === 5) expectedMinutes = 240; // Sex
                    else if (dow === 6) expectedMinutes = 480; // Sab
                    else expectedMinutes = 0; // Dom
                } else if (is12x36) {
                    expectedMinutes = Math.abs(differenceInCalendarDays(day, anchorDay)) % 2 === 0 ? 660 : 0;
                } else if (is3hMorning) {
                    expectedMinutes = Math.abs(differenceInCalendarDays(day, anchorDay)) % 2 === 0 ? 180 : 0;
                } else {
                    if (dow === 0) {
                        expectedMinutes = 0;
                    } else if (dow === 6) {
                        if (isSaturdayAlternating) {
                             // Regra para IDs 2 e 3: Sábado sim/não.
                             expectedMinutes = dayEntries.length > 0 ? 480 : 0;
                        } else if (isSaturdayMorning) {
                            expectedMinutes = 240; // 4 horas
                        } else {
                            expectedMinutes = hasSaturdayWork ? 240 : 0;
                        }
                    } else {
                        expectedMinutes = 480;
                    }
                }
                const shouldWork = expectedMinutes > 0;

                const rowClass = (!shouldWork && !hasAnyEntry) ? 'weekend' : '';
                
                const fmt = (e: TimeEntryRow | undefined) => {
                    if (!e) return '';
                    const timeStr = format(new Date(e.timestamp), 'HH:mm');
                    return e.is_manual ? `${timeStr}*` : timeStr;
                };

                const hasAbono = dayEntries.some(e => e.type === 'abono');
                // Se houver abono, ignoramos as marcações de horário para não "sujar" o espelho
                let normalEntries = hasAbono ? [] : dayEntries.filter(e => e.type !== 'abono');

                // Night Shift Lookahead Logic
                if (isNightShift && normalEntries.length > 0) {
                    const nextDay = addDays(day, 1);
                    const nextKey = format(nextDay, 'yyyy-MM-dd');
                    const nextDayEntries = entriesByDay.get(nextKey) || [];
                    
                    // Take entries from next day that are before 14:00 (2 PM)
                    // This covers the end of a night shift (07:00) plus potential overtime
                    const nextDayShiftEntries = nextDayEntries.filter(e => {
                        const h = new Date(e.timestamp).getHours();
                        return h < 14 && !consumedEntryIds.has(e.id);
                    });

                    if (nextDayShiftEntries.length > 0) {
                        nextDayShiftEntries.forEach(e => consumedEntryIds.add(e.id));
                        normalEntries.push(...nextDayShiftEntries);
                    }
                }

                // Deduplicate normalEntries by timestamp
                const uniqueMap = new Map();
                normalEntries.forEach(e => uniqueMap.set(new Date(e.timestamp).getTime(), e));
                normalEntries = Array.from(uniqueMap.values());
                normalEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                
                // Assignment Logic: Types first, then remaining slots
                const usedIds = new Set<string>();
                
                // 1. Try assign by type
                let entrada1 = normalEntries.find(e => e.type === 'entrada');
                if (entrada1) usedIds.add(entrada1.id);
                
                let saida1 = normalEntries.find(e => e.type === 'intervalo' && !usedIds.has(e.id));
                if (saida1) usedIds.add(saida1.id);
                
                let entrada2 = normalEntries.find(e => e.type === 'retorno' && !usedIds.has(e.id));
                if (entrada2) usedIds.add(entrada2.id);
                
                let saida2 = normalEntries.find(e => e.type === 'saida' && !usedIds.has(e.id));
                if (saida2) usedIds.add(saida2.id);
                
                // 2. Fill gaps with unused entries respecting chronological order
                const unusedEntries = normalEntries.filter(e => !usedIds.has(e.id));
                
                const consumeNextUnused = (afterTime?: number) => {
                    const idx = unusedEntries.findIndex(e => {
                        if (!afterTime) return true;
                        return new Date(e.timestamp).getTime() > afterTime;
                    });
                    
                    if (idx !== -1) {
                        const entry = unusedEntries[idx];
                        unusedEntries.splice(idx, 1); // Remove from unused
                        usedIds.add(entry.id);
                        return entry;
                    }
                    return undefined;
                };

                if (!entrada1) entrada1 = consumeNextUnused();
                
                const t1Time = entrada1 ? new Date(entrada1.timestamp).getTime() : 0;
                if (!saida1) saida1 = consumeNextUnused(t1Time);
                
                const t2Time = saida1 ? new Date(saida1.timestamp).getTime() : t1Time;
                if (!entrada2) entrada2 = consumeNextUnused(t2Time);
                
                const t3Time = entrada2 ? new Date(entrada2.timestamp).getTime() : t2Time;
                if (!saida2) saida2 = consumeNextUnused(t3Time);

                const t1 = fmt(entrada1);
                const t2 = fmt(saida1);
                const t3 = fmt(entrada2);
                const t4 = fmt(saida2);

                let workedMinutes = 0;
                let nightMinutes = 0;

                // Calculate Pair 1
                if (entrada1 && saida1) {
                    const start = new Date(entrada1.timestamp);
                    const end = new Date(saida1.timestamp);
                    workedMinutes += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                    nightMinutes += calculateNightMinutes(start, end);
                }

                // Calculate Pair 2
                if (entrada2 && saida2) {
                    const start = new Date(entrada2.timestamp);
                    const end = new Date(saida2.timestamp);
                    workedMinutes += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                    nightMinutes += calculateNightMinutes(start, end);
                }

                // Fallback for Continuous Shift (e1 -> s2) only if inner punches are missing
                if (entrada1 && saida2 && !saida1 && !entrada2) {
                    const start = new Date(entrada1.timestamp);
                    const end = new Date(saida2.timestamp);
                    workedMinutes += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                    nightMinutes += calculateNightMinutes(start, end);
                }

                const formatMinutes = (mins: number) => {
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    return `${pad(h, 2)}:${pad(m, 2)}`;
                };

                const normaisMinutes = shouldWork ? Math.min(workedMinutes, expectedMinutes) : 0;
                const faltasMinutes = (shouldWork && isPast && !hasAbono) ? Math.max(0, expectedMinutes - workedMinutes) : 0;
                const extrasMinutes = shouldWork ? Math.max(0, workedMinutes - expectedMinutes) : workedMinutes;

                totalNormais += normaisMinutes;
                totalFaltas += faltasMinutes;
                totalExtras += extrasMinutes;
                totalAdicionalNoturno += nightMinutes;


                const expectedStartDate = new Date(day);
                const [eh, em] = expectedStart.split(':').map(Number);
                expectedStartDate.setHours(eh, em, 0, 0);
                const atrasoMins = (shouldWork && entrada1)
                  ? Math.max(0, Math.round((new Date(entrada1.timestamp).getTime() - expectedStartDate.getTime()) / 60000))
                  : 0;
                const atrasoMinutes = atrasoMins > 5 ? atrasoMins : 0;
                totalAtrasos += atrasoMinutes;

                const obsParts: string[] = [];
                if (atrasoMinutes > 0) obsParts.push(`ATRASO ${formatMinutes(atrasoMinutes)}`);
                if (!shouldWork && workedMinutes > 0) obsParts.push(`EXTRA ${formatMinutes(workedMinutes)}`);

                // Collect Justifications
                const justifications = dayEntries
                    .map(e => e.justification)
                    .filter(j => j)
                    .join('; ');
                if (justifications) obsParts.push(justifications.toUpperCase());

                if (dow === 6 && isSaturdayAlternating && !shouldWork && !hasAnyEntry) {
                    obsParts.length = 0;
                    obsParts.push('SÁBADO DE FOLGA');
                }

                let timeCells = `
                    <td>${t1}</td>
                    <td>${t2}</td>
                    <td>${t3}</td>
                    <td>${t4}</td>
                `;

                if (!hasAnyEntry) {
                    if (!shouldWork) {
                        timeCells = `<td colspan="4" style="text-align: center; color: #888; letter-spacing: 2px;">FOLGA</td>`;
                        if (!(dow === 6 && isSaturdayAlternating) && !obsParts.includes('FOLGA')) {
                            obsParts.push('FOLGA');
                        }
                    } else if (isPast) {
                        if (!obsParts.includes('FALTA')) obsParts.push('FALTA');
                    }
                }

                const normais = normaisMinutes > 0 ? formatMinutes(normaisMinutes) : '';
                const faltas = faltasMinutes > 0 ? formatMinutes(faltasMinutes) : '';
                const extras = extrasMinutes > 0 ? formatMinutes(extrasMinutes) : '';
                const adNot = nightMinutes > 0 ? formatMinutes(nightMinutes) : '';
                const obs = obsParts.join(' | ');

                html += `
                    <tr class="${rowClass}">
                        <td class="row-day">${dayStr}</td>
                        ${timeCells}
                        <td>${normais}</td>
                        <td>${faltas}</td>
                        <td>${extras}</td>
                        <td>${adNot}</td>
                        <td style="font-size: 8px;">${obs}</td>
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
                        <td>${formatMinutes(totalAdicionalNoturno)}</td>
                        <td style="font-size: 8px;">${totalAtrasos > 0 ? `ATRASOS: ${formatMinutes(totalAtrasos)}` : ''}</td>
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

    } catch (error: unknown) {
        console.error("Erro ao gerar PDF:", error);
        throw error;
    }
};
