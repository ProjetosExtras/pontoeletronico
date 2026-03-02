import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, differenceInCalendarDays, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to pad strings
const pad = (str: string | number, length: number, char: string = '0') => {
    return String(str).padStart(length, char);
};

// Helper to format CNPJ/CPF removing special chars
const cleanDoc = (doc: string) => doc.replace(/\D/g, '');

// Function to generate/retrieve unique signature
const getOrCreateSignature = async (employeeId: string, period: string, companyId: string) => {
    try {
        // Try to find existing
        const { data: existing } = await supabase
            .from('point_mirror_signatures')
            .select('signature_code')
            .eq('employee_id', employeeId)
            .eq('reference_period', period)
            .single();

        if (existing) return existing.signature_code;

        // Generate new
        const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
        const datePart = Date.now().toString(36).toUpperCase().substring(4);
        const signatureCode = `SIG-${period.replace('-', '')}-${randomPart}-${datePart}`;

        const { error: insertError } = await supabase
            .from('point_mirror_signatures')
            .insert({
                company_id: companyId,
                employee_id: employeeId,
                reference_period: period,
                signature_code: signatureCode
            });

        if (insertError) {
            console.error("Error saving signature (table might not exist):", insertError);
            // Return generated one anyway so it appears in PDF even if not persisted
            return signatureCode;
        }

        return signatureCode;
    } catch (e) {
        console.error("Signature error:", e);
        return `SIG-TEMP-${Date.now()}`;
    }
};

type EmployeeRow = {
    name?: string | null;
    pis?: string | null;
    code?: string | null;
    cpf?: string | null;
    admission_date?: string | null;
    job_title?: string | null;
    shift_type?: string | null;
    work_shift_id?: string | null;
    work_shifts?: {
        id: string;
        name: string;
        type: 'weekly' | '12x36';
        schedule_json: any;
    } | null;
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

        // Group by Employee (use employee_id to avoid collisions on same names)
        const employeesMap = new Map<string, { id: string | undefined; data: EmployeeRow; entries: TimeEntryRow[] }>();
        entries.forEach((entry) => {
            // Use ID if available, otherwise Name, otherwise 'unknown'
            const empKey = entry.employee_id || entry.employees?.name || 'unknown';
            if (!employeesMap.has(empKey)) {
                employeesMap.set(empKey, {
                    id: entry.employee_id,
                    data: entry.employees || {},
                    entries: []
                });
            }
            employeesMap.get(empKey)!.entries.push(entry);
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
        for (const [, empObj] of employeesMap) {
            const empName = empObj.data?.name || "Funcionário Desconhecido";
            const empData = empObj.data;
            
            // Get Signature
            const periodKey = format(startPeriod, 'yyyy-MM');
            const signatureCode = empObj.id ? await getOrCreateSignature(empObj.id, periodKey, company.id) : '';

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
            const workedDayKeys = Array.from(entriesByDay.keys())
                .filter(k => new Date(k + 'T00:00:00') >= startPeriod)
                .sort();
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
            .select('*, employees(name, pis, code, cpf, admission_date, job_title, shift_type, work_shift_id, work_shifts(*))')
            .eq('company_id', profile.company_id)
             .gte('timestamp', subDays(startPeriod, 1).toISOString())
             .lte('timestamp', addDays(endPeriod, 1).toISOString())
             .order('timestamp', { ascending: true });

         if (employeeId && employeeId !== 'all') {
             query = query.eq('employee_id', employeeId);
         }

         const { data: entriesRaw } = await query;
         const entries = (entriesRaw as unknown as TimeEntryRow[] | null) || [];

        if (entries.length === 0) throw new Error("Sem dados para gerar o relatório neste período.");

        // Group by Employee (use employee_id to avoid collisions on same names)
        const employeesMap = new Map<string, { id: string | undefined; data: EmployeeRow; entries: TimeEntryRow[] }>();
        entries.forEach((entry) => {
            // Use ID if available, otherwise Name, otherwise 'unknown'
            const empKey = entry.employee_id || entry.employees?.name || 'unknown';
            if (!employeesMap.has(empKey)) {
                employeesMap.set(empKey, {
                    id: entry.employee_id,
                    data: entry.employees || {},
                    entries: []
                });
            }
            employeesMap.get(empKey)!.entries.push(entry);
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
        for (const [, empObj] of employeesMap) {
            const empName = empObj.data?.name || "Funcionário Desconhecido";
            if (pageCount > 0) {
                doc.addPage();
            }
            pageCount++;

            const empData = empObj.data;
            
            // Get Signature
            const periodKey = format(startPeriod, 'yyyy-MM');
            const signatureCode = empObj.id ? await getOrCreateSignature(empObj.id, periodKey, company.id) : '';

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

            const workedDayKeys = Array.from(entriesByDay.keys())
                .filter(k => new Date(k + 'T00:00:00') >= startPeriod)
                .sort();
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
            let isSegQuiSab716Sex711 = false;
            let isSegSex716Sab812 = false;
            let isSegSex08_18Sab812 = false;
            let is4hMorning = false;
            let isSegSex08_11 = false;
            let isSegSex08_12 = false;
            let isSegDom0630_1550 = false;
            let isCustomWeekly = false;
            let customSchedule: any = null;
            let customShiftName = "";

            if (shiftTypeOverride && shiftTypeOverride !== 'auto') {
                if (shiftTypeOverride === '12x36') {
                    is12x36 = true;
                    isNightShift = false;
                } else if (shiftTypeOverride === '12x36_noturno') {
                    is12x36 = true;
                    isNightShift = true;
                } else if (shiftTypeOverride === '3h_diurno') {
                    is3hMorning = true;
                } else if (shiftTypeOverride === 'seg_sex_08_11') {
                    isSegSex08_11 = true;
                } else if (shiftTypeOverride === 'seg_sex_08_12') {
                    isSegSex08_12 = true;
                } else if (shiftTypeOverride === 'seg_dom_0630_1550') {
                    isSegDom0630_1550 = true;
                } else if (shiftTypeOverride === 'standard_09_18') {
                    isStandard0918 = true;
                } else if (shiftTypeOverride === 'standard') {
                    is12x36 = false;
                    isNightShift = false;
                } else if (shiftTypeOverride === 'seg_qui_sab_7_16_sex_7_11') {
                    isSegQuiSab716Sex711 = true;
                } else if (shiftTypeOverride === 'seg_sex_07_16_sab_08_12') {
                    isSegSex716Sab812 = true;
                } else if (shiftTypeOverride === 'seg_sex_08_18_sab_08_12') {
                    isSegSex08_18Sab812 = true;
                } else if (shiftTypeOverride === '4h_matutino') {
                    is4hMorning = true;
                }
            } else if (empData.work_shifts && empData.work_shift_id) {
                // Priority to Custom Shift from DB
                const ws = empData.work_shifts;
                customShiftName = ws.name;
                if (ws.type === '12x36') {
                    is12x36 = true;
                    // Basic inference for night shift based on start time
                    if (ws.schedule_json?.start === '19:00') isNightShift = true;
                } else {
                    isCustomWeekly = true;
                    customSchedule = ws.schedule_json;
                }
            } else if (empData.shift_type) {
                is12x36 = empData.shift_type === '12x36' || empData.shift_type === '12x36_noturno';
                isNightShift = empData.shift_type === '12x36_noturno';
                is3hMorning = empData.shift_type === '3h_diurno';
                isStandard0918 = empData.shift_type === 'standard_09_18';
                isSegQuiSab716Sex711 = empData.shift_type === 'seg_qui_sab_7_16_sex_7_11';
                isSegSex716Sab812 = empData.shift_type === 'seg_sex_07_16_sab_08_12';
                isSegSex08_18Sab812 = empData.shift_type === 'seg_sex_08_18_sab_08_12';
                is4hMorning = empData.shift_type === '4h_matutino';
                isSegSex08_11 = empData.shift_type === 'seg_sex_08_11';
                isSegSex08_12 = empData.shift_type === 'seg_sex_08_12';
                isSegDom0630_1550 = empData.shift_type === 'seg_dom_0630_1550';
            } else {
                // Heuristic fallback
                is12x36 = workedDaysCount >= 3 && longShiftDaysCount >= 3 && longShiftDaysCount / workedDaysCount >= 0.5;
            }

            // FORCE some IDs TO BE 12x36 Diurno (07:00 - 19:00) only if no explicit configuration
            const hasExplicitConfig = (shiftTypeOverride && shiftTypeOverride !== 'auto') || 
                                      (empData.work_shifts && empData.work_shift_id) || 
                                      (empData.shift_type && empData.shift_type !== 'auto');

            if (!hasExplicitConfig && empCode === '21') {
                isSegQuiSab716Sex711 = true;
            }

            if (!hasExplicitConfig && empCode === '9') {
                isSegSex08_18Sab812 = true;
            }

            if (!hasExplicitConfig && empCode === '17') {
                isSegSex08_12 = true;
            }

            if (!hasExplicitConfig && (empCode === '18' || empCode === '19' || empCode === '20')) {
                isSegDom0630_1550 = true;
                is12x36 = false;
            }

            // IDs that are definitely 12x36 (Forced for specific IDs to ensure correctness regardless of DB)
            const isTarget12x36 = (empCode === '30' || empCode === '12' || empCode === '10' || empCode === '31' || empCode === '13' || empCode === '28' || empCode === '11' || empCode === '5' || empCode === '22' || empCode === '14' || empCode === '26' || empCode === '24' || empCode === '25');
            const shouldForce12x36 = ['10', '14', '24', '26', '31', '25'].includes(empCode);

            if (isTarget12x36 && (!hasExplicitConfig || shouldForce12x36)) {
                is12x36 = true;
                isNightShift = empCode === '10' || empCode === '31' || empCode === '14' || empCode === '26';
                is3hMorning = false;
                isStandard0918 = false;
                isSegQuiSab716Sex711 = false;
                isCustomWeekly = false;
                isSegSex716Sab812 = false;
            }

            // Configuração específica para ID 32: Escala 12x36 alternada, mas com carga horária de 3h Diurno (08:00-11:00)
            let is3hAlternating = empData.shift_type === '3h_alternado';
            if (empCode === '32') {
                is12x36 = false; // Desativa 12x36 padrão para não conflitar
                is3hAlternating = true;
            }

            const hasSaturdayWork = workedDayKeys.some((key) => {
                const d = new Date(`${key}T00:00:00`);
                return getDay(d) === 6;
            });

            const anchorKey = workedDayKeys[0];
            let anchorDay = anchorKey ? new Date(`${anchorKey}T00:00:00`) : new Date(startPeriod);

            // FIX: Use admission date as stable anchor for 12x36 shifts to prevent phase inversion
            // when employee misses the first shift of the month.
            if (is12x36 || is3hMorning || is3hAlternating) {
                if (empData.admission_date) {
                    const admStr = String(empData.admission_date).split('T')[0];
                    anchorDay = new Date(`${admStr}T00:00:00`);
                } else if (empCode === '12' || empCode === '30') {
                    // Fallback for ID 12/30 if no admission date
                    anchorDay = new Date('2024-01-01T00:00:00');
                }

                // Ajuste de inversão para ID 30, 32 e 12
                if (empCode === '30' || empCode === '12' || empCode === '32') {
                     anchorDay = addDays(anchorDay, 1);
                }
            }

            const consumedEntryIds = new Set<string>();

            // PRE-PROCESS PREVIOUS DAY (Lookahead Logic for Night Shift)
            // This ensures that if a shift started on the previous day (before startPeriod),
            // its exit on the first day of startPeriod is "consumed" and doesn't appear as an orphan entry.
            const prevDay = subDays(startPeriod, 1);
            const prevDayKey = format(prevDay, 'yyyy-MM-dd');
            const prevDayEntries = entriesByDay.get(prevDayKey) || [];
            
            if (prevDayEntries.length > 0) {
                 const hasAbonoPrev = prevDayEntries.some(e => e.type === 'abono');
                 const normalEntriesPrev = hasAbonoPrev ? [] : prevDayEntries.filter(e => e.type !== 'abono');
                 
                 const lastEntryPrev = normalEntriesPrev.length > 0 ? normalEntriesPrev[normalEntriesPrev.length - 1] : null;
                 const lastHourPrev = lastEntryPrev ? new Date(lastEntryPrev.timestamp).getHours() : 0;
                 
                 const seemsIncompletePrev = lastEntryPrev && (
                     (lastEntryPrev.type === 'entrada' || lastEntryPrev.type === 'retorno') || 
                     (normalEntriesPrev.length % 2 !== 0 && lastEntryPrev.type !== 'saida' && lastEntryPrev.type !== 'intervalo')
                 );

                 const shouldLookAheadPrev = isNightShift || (lastHourPrev >= 18 && seemsIncompletePrev);
                 
                 if (shouldLookAheadPrev) {
                     const nextDay = addDays(prevDay, 1);
                     const nextKey = format(nextDay, 'yyyy-MM-dd');
                     const nextDayEntries = entriesByDay.get(nextKey) || [];
                     
                     const lookAheadLimit = isNightShift ? 14 : 6;
                     const nextDayShiftEntries = nextDayEntries.filter(e => {
                         const h = new Date(e.timestamp).getHours();
                         return h < lookAheadLimit; 
                     });

                     if (nextDayShiftEntries.length > 0) {
                         nextDayShiftEntries.forEach(e => consumedEntryIds.add(e.id));
                     }
                 }
            }

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

            let scheduleLabel = '';
            if (is12x36) {
                scheduleLabel = isNightShift ? '12X36 NOTURNO (19:00-07:00)' : '12X36 (07:00-19:00)';
            } else if (is3hAlternating) {
                scheduleLabel = '3H DIURNO - ESCALA ALTERNADA (08:00-11:00) - DOMINGOS FOLGA';
            } else if (isCustomWeekly) {
                scheduleLabel = customShiftName.toUpperCase();
            } else if (isSegSex716Sab812) {
                scheduleLabel = 'SEG-SEX 07:00-16:00 | SAB 08:00-12:00';
            } else if (isSegSex08_18Sab812) {
                scheduleLabel = 'SEG-SEX 08:00-18:00 | SAB 08:00-12:00';
            } else if (isSegQuiSab716Sex711) {
                scheduleLabel = 'SEG-QUI+SAB 07:00-16:00 | SEX 07:00-11:00';
            } else if (is4hMorning) {
                scheduleLabel = '4H MATUTINO (08:00-12:00)';
            } else if (is3hMorning) {
                scheduleLabel = '3H DIURNO';
            } else if (isSegSex08_11) {
                scheduleLabel = 'SEG-SEX 08:00-11:00';
            } else if (isSegSex08_12) {
                scheduleLabel = 'SEG-SEX 08:00-12:00';
            } else if (isSegDom0630_1550) {
                scheduleLabel = 'SEG-DOM 06:30-15:50';
            } else if (isStandard0918 || isId3) {
                scheduleLabel = 'PADRÃO (SEG-SEX 09:00-18:00, SAB 08:00-17:00)';
            } else {
                scheduleLabel = 'NORMAL';
            }
            
            let scheduleRows = '';
            if (is12x36) {
                 scheduleRows = isNightShift 
                 ? `<tr><td>ESC</td><td>19:00</td><td>00:00</td><td>01:00</td><td>07:00</td></tr>`
                 : `<tr><td>ESC</td><td>07:00</td><td>12:00</td><td>13:00</td><td>19:00</td></tr>`;
            } else if (is3hAlternating) {
                 scheduleRows = `<tr><td>ESC</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`;
            } else if (isCustomWeekly && customSchedule) {
                 const dayLabels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
                 scheduleRows = dayLabels.map((label, i) => {
                     const cfg = customSchedule[String(i)];
                     if (!cfg || !cfg.start || !cfg.end) return '';
                     
                     // Check duration to decide rendering layout
                     const [h1, m1] = cfg.start.split(':').map(Number);
                     const [h2, m2] = cfg.end.split(':').map(Number);
                     let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
                     if (mins < 0) mins += 1440;

                     // If shift is 6h or less, render as Entry 1 / Exit 1 (Continuous)
                     if (mins <= 360) {
                        return `<tr><td>${label}</td><td>${cfg.start}</td><td>${cfg.end}</td><td> - </td><td> - </td></tr>`;
                     }
                     
                     // If shift is longer, render as Entry 1 / Exit 2 (Split/Long)
                     return `<tr><td>${label}</td><td>${cfg.start}</td><td> - </td><td> - </td><td>${cfg.end}</td></tr>`;
                 }).join('');
            } else if (isSegSex716Sab812) {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>TER</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>QUA</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>QUI</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>SEX</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>SAB</td><td>08:00</td><td> - </td><td> - </td><td>12:00</td></tr>`
                 ].join('');
            } else if (isSegSex08_18Sab812) {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>08:00</td><td>12:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>TER</td><td>08:00</td><td>12:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>QUA</td><td>08:00</td><td>12:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>QUI</td><td>08:00</td><td>12:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>SEX</td><td>08:00</td><td>12:00</td><td>14:00</td><td>18:00</td></tr>`,
                    `<tr><td>SAB</td><td>08:00</td><td>12:00</td><td> - </td><td>12:00</td></tr>`
                 ].join('');
            } else if (isSegQuiSab716Sex711) {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>TER</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>QUA</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>QUI</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`,
                    `<tr><td>SEX</td><td>07:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>SAB</td><td>07:00</td><td>12:00</td><td>13:00</td><td>16:00</td></tr>`
                 ].join('');
            } else if (is4hMorning || isSegSex08_12) {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>08:00</td><td>12:00</td><td> - </td><td> - </td></tr>`,
                    `<tr><td>TER</td><td>08:00</td><td>12:00</td><td> - </td><td> - </td></tr>`,
                    `<tr><td>QUA</td><td>08:00</td><td>12:00</td><td> - </td><td> - </td></tr>`,
                    `<tr><td>QUI</td><td>08:00</td><td>12:00</td><td> - </td><td> - </td></tr>`,
                    `<tr><td>SEX</td><td>08:00</td><td>12:00</td><td> - </td><td> - </td></tr>`
                 ].join('');
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
            } else if (isSegSex08_11) {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>TER</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>QUA</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>QUI</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`,
                    `<tr><td>SEX</td><td>08:00</td><td> - </td><td> - </td><td>11:00</td></tr>`
                 ].join('');
            } else if (isSegDom0630_1550) {
                 scheduleRows = [
                    `<tr><td>SEG</td><td>06:30</td><td>12:00</td><td>14:00</td><td>15:50</td></tr>`,
                    `<tr><td>TER</td><td>06:30</td><td>12:00</td><td>14:00</td><td>15:50</td></tr>`,
                    `<tr><td>QUA</td><td>06:30</td><td>12:00</td><td>14:00</td><td>15:50</td></tr>`,
                    `<tr><td>QUI</td><td>06:30</td><td>12:00</td><td>14:00</td><td>15:50</td></tr>`,
                    `<tr><td>SEX</td><td>06:30</td><td>12:00</td><td>14:00</td><td>15:50</td></tr>`,
                    `<tr><td>SAB</td><td>06:30</td><td>12:00</td><td>14:00</td><td>15:50</td></tr>`,
                    `<tr><td>DOM</td><td>06:30</td><td>12:00</td><td>14:00</td><td>15:50</td></tr>`
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
                    .wrapper { font-family: 'Arial', sans-serif; font-size: 9px; color: #000; min-height: 270mm; position: relative; padding-bottom: 50px; box-sizing: border-box; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 5px; table-layout: fixed; }
                    th, td { border: 1px solid #ccc; padding: 3px 4px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; vertical-align: middle; }
                    .header-section { display: flex; gap: 15px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    .info-left { flex: 2; }
                    .info-right { flex: 1; }
                    .info-row { display: flex; border-bottom: 1px solid #ddd; }
                    .info-label { width: 100px; background-color: #f0f0f0; padding: 1px 4px; font-weight: bold; border-right: 1px solid #ddd; display: flex; align-items: center; font-size: 9px; }
                    .info-value { flex: 1; padding: 1px 4px; display: flex; align-items: center; font-size: 9px; }
                    .section-title { font-weight: bold; background-color: #e0e0e0; padding: 3px; border: 1px solid #ccc; text-align: center; font-size: 10px; }
                    .main-table th { background-color: #333; color: white; text-align: center; font-size: 8px; padding: 4px 2px; }
                    .main-table td { text-align: center; font-size: 8px; height: 16px; padding: 3px 2px; line-height: 1.3; }
                    .row-day { background-color: #fff; text-align: left !important; padding-left: 5px !important; font-weight: normal; font-family: 'Courier New', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: 16px; line-height: 16px; }
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
                // Apply reduction factor: 1 night hour = 52.5 clock minutes
                // Multiplier = 60 / 52.5 ≈ 1.142857
                return Math.round(minutes * (60 / 52.5));
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
                if (isCustomWeekly && customSchedule) {
                    const cfg = customSchedule[String(dow)];
                    if (cfg?.start) expectedStart = cfg.start;
                } else if (isSegSex716Sab812) {
                    if (dow >= 1 && dow <= 5) expectedStart = '07:00';
                    else if (dow === 6) expectedStart = '08:00';
                } else if (is12x36) {
                    expectedStart = isNightShift ? '19:00' : '07:00';
                } else if (isStandard0918 || isId3) {
                    if (dow === 6 && isSaturdayAlternating && dayEntries.length > 0) {
                        expectedStart = '08:00';
                    } else {
                        expectedStart = '09:00';
                    }
                } else if (isSegQuiSab716Sex711) {
                    expectedStart = '07:00';
                } else if (is4hMorning || isSegSex08_12) {
                    expectedStart = '08:00';
                } else if (isSegSex08_11) {
                    expectedStart = '08:00';
                } else if (isSegSex08_18Sab812) {
                    expectedStart = '08:00';
                } else if (isSegDom0630_1550) {
                    expectedStart = '06:30';
                }
                
                let expectedMinutes = 0;
                if (isCustomWeekly && customSchedule) {
                    const cfg = customSchedule[String(dow)];
                    if (cfg?.start && cfg?.end) {
                        const [h1, m1] = cfg.start.split(':').map(Number);
                        const [h2, m2] = cfg.end.split(':').map(Number);
                        let totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
                        if (totalMins < 0) totalMins += 1440; // Handle cross-midnight if needed, though weekly usually doesn't
                        expectedMinutes = totalMins > 360 ? totalMins - 60 : totalMins;
                        if (expectedMinutes < 0) expectedMinutes = 0;
                    }
                } else if (isSegSex716Sab812) {
                    if (dow >= 1 && dow <= 5) expectedMinutes = 480; // 8h (9h span - 1h break)
                    else if (dow === 6) expectedMinutes = 240; // 4h
                    else expectedMinutes = 0;
                } else if (is4hMorning) {
                    if (dow >= 1 && dow <= 5) expectedMinutes = 240; // 4h
                    else expectedMinutes = 0;
                } else if (isSegQuiSab716Sex711) {
                    if (dow >= 1 && dow <= 4) expectedMinutes = 480;
                    else if (dow === 5) expectedMinutes = 240;
                    else if (dow === 6) expectedMinutes = 480;
                    else expectedMinutes = 0;
                } else if (is12x36) {
                    if (empCode === '12' || empCode === '32' || empCode === '10' || empCode === '31' || empCode === '13' || empCode === '28' || empCode === '11' || empCode === '26' || empCode === '5' || empCode === '22' || empCode === '14' || empCode === '24' || empCode === '25') {
                        expectedMinutes = hasAnyEntry ? 660 : 0;
                    } else {
                        expectedMinutes = Math.abs(differenceInCalendarDays(day, anchorDay)) % 2 === 0 ? 660 : 0;
                    }
                } else if (is3hAlternating) {
                    // Lógica de dias alternados para 3h Diurno
                    // Se for domingo (0), folga forçada
                    if (dow === 0) {
                         expectedMinutes = 0;
                    } else {
                         expectedMinutes = Math.abs(differenceInCalendarDays(day, anchorDay)) % 2 === 0 ? 180 : 0;
                    }
                } else if (is3hMorning) {
                    if (dow >= 1 && dow <= 5) expectedMinutes = 180;
                    else if (dow === 6 && hasSaturdayWork) expectedMinutes = 180;
                    else expectedMinutes = 0;
                } else if (isSegSex08_11) {
                    if (dow >= 1 && dow <= 5) expectedMinutes = 180;
                    else expectedMinutes = 0;
                } else if (isSegSex08_12) {
                    if (dow >= 1 && dow <= 5) expectedMinutes = 240;
                    else expectedMinutes = 0;
                } else if (isSegSex08_18Sab812) {
                    if (dow >= 1 && dow <= 5) expectedMinutes = 480;
                    else if (dow === 6) expectedMinutes = 240;
                    else expectedMinutes = 0;
                } else if (isSegDom0630_1550) {
                    expectedMinutes = 440; // 06:30-15:50 com 2h de intervalo (7h20)
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
                const lastEntry = normalEntries.length > 0 ? normalEntries[normalEntries.length - 1] : null;
                const lastHour = lastEntry ? new Date(lastEntry.timestamp).getHours() : 0;
                
                // Check if we should look ahead: 
                // 1. Configured as Night Shift
                // 2. OR Late entry (>=18h) that seems incomplete (odd count or explicit start type)
                const seemsIncomplete = lastEntry && (
                    (lastEntry.type === 'entrada' || lastEntry.type === 'retorno') || 
                    (normalEntries.length % 2 !== 0 && lastEntry.type !== 'saida' && lastEntry.type !== 'intervalo')
                );
                
                const shouldLookAhead = isNightShift || (lastHour >= 18 && seemsIncomplete);
                let lookedAheadEntries: TimeEntryRow[] = [];

                if (shouldLookAhead && normalEntries.length > 0) {
                    const nextDay = addDays(day, 1);
                    const nextKey = format(nextDay, 'yyyy-MM-dd');
                    const nextDayEntries = entriesByDay.get(nextKey) || [];
                    
                    // Take entries from next day that are before 14:00 (2 PM)
                    // This covers the end of a night shift (07:00) plus potential overtime
                    // For day shifts (not night shift), limit lookahead to 06:00 AM to avoid consuming next day's morning shift
                    const lookAheadLimit = isNightShift ? 14 : 6;
                    const nextDayShiftEntries = nextDayEntries.filter(e => {
                        const h = new Date(e.timestamp).getHours();
                        return h < lookAheadLimit && !consumedEntryIds.has(e.id);
                    });

                    if (nextDayShiftEntries.length > 0) {
                        nextDayShiftEntries.forEach(e => consumedEntryIds.add(e.id));
                        normalEntries.push(...nextDayShiftEntries);
                        lookedAheadEntries = nextDayShiftEntries;
                    }
                }

                // Deduplicate normalEntries by timestamp
                const uniqueMap = new Map();
                normalEntries.forEach(e => uniqueMap.set(new Date(e.timestamp).getTime(), e));
                normalEntries = Array.from(uniqueMap.values());

                // FIX: Detect and fix mis-dated night shift exits (e.g. 07:00 on same day as 19:00 start)
                const startEntry = normalEntries.find(e => (e.type === 'entrada' || e.type === 'retorno') && new Date(e.timestamp).getHours() >= 18);
                if (startEntry) {
                     normalEntries.forEach(e => {
                         const d = new Date(e.timestamp);
                         const h = d.getHours();
                         // If entry is early morning (< 13:00) and strictly earlier than start time on same day
                         // It implies it belongs to next day (user error)
                         if (h < 13 && d.getTime() < new Date(startEntry.timestamp).getTime()) {
                              // Mutate timestamp to next day
                              const fixedDate = addDays(d, 1);
                              e.timestamp = fixedDate.toISOString();
                         }
                     });
                }

                // Sort again after potential timestamp fixes
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
                
                // FIX: Search for saida2 from the end (last 'saida') to avoid grabbing intermediate exits
                let saida2 = normalEntries.slice().reverse().find(e => e.type === 'saida' && !usedIds.has(e.id));
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

                // FIX: Fallback for night shift exit that might be sorted earlier due to wrong date (e.g. 07:00 on same day as start)
                if (!saida2 && unusedEntries.length > 0) {
                     // Find an entry that looks like a morning exit (e.g. < 12:00)
                     const morningExitIndex = unusedEntries.findIndex(e => {
                         const h = new Date(e.timestamp).getHours();
                         return h < 13; // Allow up to 13:00 just in case
                     });
                     
                     if (morningExitIndex !== -1) {
                         saida2 = unusedEntries[morningExitIndex];
                         unusedEntries.splice(morningExitIndex, 1);
                         usedIds.add(saida2.id);
                     }
                }

                // FIX: For short shifts (4h/3h), move saida2 to saida1 if we have just 2 punches
                if ((is4hMorning || is3hMorning || isSegSex08_12 || is3hAlternating) && entrada1 && saida2 && !saida1 && !entrada2) {
                     saida1 = saida2;
                     saida2 = undefined;
                }

                // FIX: For 12x36 or Night Shift with 2 punches (Ent1, Sai2), ensure they are displayed as Ent1 and Sai2 (spanning full columns)
                // This is purely visual preference: Ent1 | | | Sai2 vs Ent1 | Sai1 | |
                // Usually long shifts look better as Ent1 ... Sai2
                if ((is12x36 || isNightShift) && entrada1 && saida2 && !saida1 && !entrada2) {
                    // Keep saida2 as saida2
                } else if (entrada1 && saida2 && !saida1 && !entrada2 && normalEntries.length === 2 && !is12x36 && !isNightShift) {
                    // For standard shifts with 2 punches (e.g. 08:00 - 17:00 no break), usually displayed as Ent1 - Sai1
                    // unless it's a very long shift?
                    // Let's assume standard behavior is Ent1 - Sai1 for single period.
                    saida1 = saida2;
                    saida2 = undefined;
                }

                const t1 = fmt(entrada1);
                const t2 = fmt(saida1);
                const t3 = fmt(entrada2);
                const t4 = fmt(saida2);

                let workedMinutes = 0;
                let nightMinutes = 0;

                // Calculate Pair 1
                if (entrada1 && saida1) {
                    const start = new Date(entrada1.timestamp);
                    let end = new Date(saida1.timestamp);
                    // FIX: If end time is before start time (e.g. 07:00 < 19:00), assume it is next day
                    if (end.getTime() < start.getTime()) {
                        end = addDays(end, 1);
                    }
                    workedMinutes += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                    nightMinutes += calculateNightMinutes(start, end);
                }

                // Calculate Pair 2
                if (entrada2 && saida2) {
                    const start = new Date(entrada2.timestamp);
                    let end = new Date(saida2.timestamp);
                    // FIX: If end time is before start time (e.g. 07:00 < 21:15), assume it is next day
                    if (end.getTime() < start.getTime()) {
                        end = addDays(end, 1);
                    }
                    workedMinutes += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
                    nightMinutes += calculateNightMinutes(start, end);
                }

                // Fallback for Continuous Shift (e1 -> s2) only if inner punches are missing
                // and there are at most 2 marcações no dia. Se houver 3 ou mais, preferimos
                // sempre tentar distribuir entre ENT1/SAI1/ENT2/SAI2.
                if (entrada1 && saida2 && !saida1 && !entrada2 && normalEntries.length <= 2) {
                    const start = new Date(entrada1.timestamp);
                    let end = new Date(saida2.timestamp);
                    // FIX: If end time is before start time, assume next day
                    if (end.getTime() < start.getTime()) {
                        end = addDays(end, 1);
                    }
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

                // FIX: Detect shift swap (Day -> Night) to avoid 12h delay
                // If expected is 07:00 but first entry is >= 18:00, assume night shift start (19:00)
                if (expectedStart === '07:00' && entrada1) {
                    const h = new Date(entrada1.timestamp).getHours();
                    if (h >= 18) {
                         expectedStartDate.setHours(19, 0, 0, 0);
                    }
                }

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

                if (lookedAheadEntries.length > 0) {
                     lookedAheadEntries.forEach(e => {
                         if (!usedIds.has(e.id)) consumedEntryIds.delete(e.id);
                     });
                }
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
                ${signatureCode ? `
                <div style="position: absolute; bottom: 0; left: 0; width: 100%; font-size: 8px; color: #555; text-align: left; border-top: 1px solid #eee; padding-top: 5px;">
                    ASSINATURA ELETRÔNICA DO SISTEMA: <strong>${signatureCode}</strong><br>
                    Documento gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
                </div>
                ` : ''}
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

        let filename = `Espelho_Ponto_${format(startPeriod, 'yyyy-MM')}.pdf`;
        if (employeesMap.size === 1) {
            const first = Array.from(employeesMap.values())[0];
            const empName = first.data?.name || "Funcionario";
            const monthStr = format(startPeriod, 'MMMM_yyyy', { locale: ptBR });
            // Remove characters that might be invalid in filenames and replace spaces with underscores
            const safeName = empName.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim().replace(/\s+/g, '_');
            filename = `${safeName}_${monthStr}.pdf`;
        }

        doc.save(filename);

    } catch (error: unknown) {
        console.error("Erro ao gerar PDF:", error);
        throw error;
    }
};

export const generateRelatorioExtrasPDF = async (employeeId: string, monthStr: string, shiftTypeOverride: string = 'auto') => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
        if (!profile?.company_id) throw new Error("Empresa não encontrada");

        const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();

        const [year, month] = monthStr.split('-').map(Number);
        const startPeriod = new Date(year, month - 1, 1);
        const endPeriod = endOfMonth(startPeriod);
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);

        let empQuery = supabase
            .from('employees')
            .select('*, work_shifts(name, type, schedule_json)')
            .eq('company_id', profile.company_id)
            .order('name');

        if (employeeId !== 'all') {
            empQuery = empQuery.eq('id', employeeId);
        }

        const { data: employeesRaw } = await empQuery;
        const employeesList = employeesRaw || [];
        if (employeesList.length === 0) throw new Error("Nenhum funcionário encontrado.");

        const { data: entriesRaw } = await supabase
            .from('time_entries')
            .select('*')
            .eq('company_id', profile.company_id)
            .gte('timestamp', subDays(startPeriod, 2).toISOString()) // Fetch extra days for lookahead
            .lte('timestamp', addDays(endPeriod, 2).toISOString())
            .order('timestamp', { ascending: true });

        const entries = (entriesRaw as unknown as TimeEntryRow[] | null) || [];
        const entriesByEmployee = new Map<string, TimeEntryRow[]>();
        entries.forEach(e => {
            if (!entriesByEmployee.has(e.employee_id)) {
                entriesByEmployee.set(e.employee_id, []);
            }
            entriesByEmployee.get(e.employee_id)!.push(e);
        });

        const rows: any[] = [];
        const daysInMonth = eachDayOfInterval({ start: startPeriod, end: endPeriod });

        // Helper function (same as in generateEspelhoPDF)
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
            return Math.round(minutes * (60 / 52.5));
        };

        for (const emp of employeesList) {
             const empEntries = entriesByEmployee.get(emp.id) || [];
             let totalExtras = 0;

             // Map entries by day
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

             const workedDayKeys = Array.from(entriesByDay.keys())
                 .filter(k => new Date(k + 'T00:00:00') >= startPeriod && new Date(k + 'T00:00:00') <= endPeriod)
                 .sort();
             const workedDaysCount = workedDayKeys.length;
             const longShiftDaysCount = workedDayKeys.reduce((acc, key) => {
                 const arr = entriesByDay.get(key) || [];
                 if (arr.length < 2) return acc;
                 const first = new Date(arr[0].timestamp);
                 const last = new Date(arr[arr.length - 1].timestamp);
                 const spanMins = Math.max(0, Math.round((last.getTime() - first.getTime()) / 60000));
                 return spanMins >= 600 ? acc + 1 : acc;
             }, 0);

             // --- Shift Determination Logic (Copied from generateEspelhoPDF) ---
             const empData = emp;
             const empCode = String(empData.code || '').trim();
             let is12x36 = false;
             let isNightShift = false;
             let is3hMorning = false;
             let isStandard0918 = false;
             let isSegQuiSab716Sex711 = false;
             let isSegSex716Sab812 = false;
             let isSegSex08_18Sab812 = false;
             let is4hMorning = false;
             let isSegSex08_11 = false;
             let isSegSex08_12 = false;
             let isSegDom0630_1550 = false;
             let isCustomWeekly = false;
             let customSchedule: any = null;

             if (shiftTypeOverride && shiftTypeOverride !== 'auto') {
                 if (shiftTypeOverride === '12x36') { is12x36 = true; isNightShift = false; }
                 else if (shiftTypeOverride === '12x36_noturno') { is12x36 = true; isNightShift = true; }
                 else if (shiftTypeOverride === '3h_diurno') { is3hMorning = true; }
                 else if (shiftTypeOverride === 'seg_sex_08_11') { isSegSex08_11 = true; }
                 else if (shiftTypeOverride === 'seg_sex_08_12') { isSegSex08_12 = true; }
                 else if (shiftTypeOverride === 'seg_dom_0630_1550') { isSegDom0630_1550 = true; }
                 else if (shiftTypeOverride === 'standard_09_18') { isStandard0918 = true; }
                 else if (shiftTypeOverride === 'standard') { 
                    is12x36 = false; 
                    isNightShift = false; 
                    // Fallback to work_shifts if available, even if 'standard' is passed
                    if (empData.work_shifts && empData.work_shift_id) {
                        const ws = empData.work_shifts;
                        if (ws.type === '12x36') {
                            is12x36 = true;
                            if (ws.schedule_json?.start === '19:00') isNightShift = true;
                        } else {
                            isCustomWeekly = true;
                            customSchedule = ws.schedule_json;
                        }
                    }
                }
                 else if (shiftTypeOverride === 'seg_qui_sab_7_16_sex_7_11') { isSegQuiSab716Sex711 = true; }
                 else if (shiftTypeOverride === 'seg_sex_07_16_sab_08_12') { isSegSex716Sab812 = true; }
                 else if (shiftTypeOverride === 'seg_sex_08_18_sab_08_12') { isSegSex08_18Sab812 = true; }
                 else if (shiftTypeOverride === '4h_matutino') { is4hMorning = true; }
             } else if (empData.work_shifts && empData.work_shift_id) {
                 const ws = empData.work_shifts;
                 if (ws.type === '12x36') {
                     is12x36 = true;
                     if (ws.schedule_json?.start === '19:00') isNightShift = true;
                 } else {
                     isCustomWeekly = true;
                     customSchedule = ws.schedule_json;
                 }
             } else if (empData.shift_type) {
                 is12x36 = empData.shift_type === '12x36' || empData.shift_type === '12x36_noturno';
                 isNightShift = empData.shift_type === '12x36_noturno';
                 is3hMorning = empData.shift_type === '3h_diurno';
                 isStandard0918 = empData.shift_type === 'standard_09_18';
                 isSegQuiSab716Sex711 = empData.shift_type === 'seg_qui_sab_7_16_sex_7_11';
                 isSegSex716Sab812 = empData.shift_type === 'seg_sex_07_16_sab_08_12';
                 isSegSex08_18Sab812 = empData.shift_type === 'seg_sex_08_18_sab_08_12';
                 is4hMorning = empData.shift_type === '4h_matutino';
                 isSegSex08_11 = empData.shift_type === 'seg_sex_08_11';
                 isSegSex08_12 = empData.shift_type === 'seg_sex_08_12';
                 isSegDom0630_1550 = empData.shift_type === 'seg_dom_0630_1550';
             } else {
                 is12x36 = workedDaysCount >= 3 && longShiftDaysCount >= 3 && longShiftDaysCount / workedDaysCount >= 0.5;
             }

             const hasExplicitConfig = (shiftTypeOverride && shiftTypeOverride !== 'auto') || (empData.work_shifts && empData.work_shift_id) || (empData.shift_type && empData.shift_type !== 'auto');
             if (!hasExplicitConfig) {
                 if (empCode === '21') isSegQuiSab716Sex711 = true;
                 if (empCode === '9') isSegSex08_18Sab812 = true;
                 if (empCode === '17') isSegSex08_12 = true;
                 if (['18', '19', '20'].includes(empCode)) { isSegDom0630_1550 = true; is12x36 = false; }
             }

             const isTarget12x36 = (empCode === '30' || empCode === '12' || empCode === '10' || empCode === '31' || empCode === '13' || empCode === '28' || empCode === '11' || empCode === '5' || empCode === '22' || empCode === '14' || empCode === '26' || empCode === '24' || empCode === '25');
             const shouldForce12x36 = ['10', '14', '24', '26', '31', '25'].includes(empCode);
             if (isTarget12x36 && (!hasExplicitConfig || shouldForce12x36)) {
                 is12x36 = true;
                 isNightShift = ['10', '31', '14', '26'].includes(empCode);
                 is3hMorning = false; isStandard0918 = false; isSegQuiSab716Sex711 = false; isCustomWeekly = false; isSegSex716Sab812 = false;
             }

             let is3hAlternating = empData.shift_type === '3h_alternado';
             if (empCode === '32') { is12x36 = false; is3hAlternating = true; }

             const hasSaturdayWork = workedDayKeys.some((key) => {
                 const d = new Date(`${key}T00:00:00`);
                 return getDay(d) === 6;
             });

             let anchorDay = workedDayKeys[0] ? new Date(`${workedDayKeys[0]}T00:00:00`) : new Date(startPeriod);
             if (is12x36 || is3hMorning || is3hAlternating) {
                 if (empData.admission_date) {
                     anchorDay = new Date(`${String(empData.admission_date).split('T')[0]}T00:00:00`);
                 } else if (empCode === '12' || empCode === '30') {
                     anchorDay = new Date('2024-01-01T00:00:00');
                 }
                 if (['30', '12', '32'].includes(empCode)) anchorDay = addDays(anchorDay, 1);
             }

             const consumedEntryIds = new Set<string>();

             // Pre-process Previous Day for Night Shift Lookahead
             const prevDay = subDays(startPeriod, 1);
             const prevDayKey = format(prevDay, 'yyyy-MM-dd');
             const prevDayEntries = entriesByDay.get(prevDayKey) || [];
             if (prevDayEntries.length > 0) {
                 const hasAbonoPrev = prevDayEntries.some(e => e.type === 'abono');
                 const normalEntriesPrev = hasAbonoPrev ? [] : prevDayEntries.filter(e => e.type !== 'abono');
                 const lastEntryPrev = normalEntriesPrev[normalEntriesPrev.length - 1];
                 const lastHourPrev = lastEntryPrev ? new Date(lastEntryPrev.timestamp).getHours() : 0;
                 const seemsIncompletePrev = lastEntryPrev && ((lastEntryPrev.type === 'entrada' || lastEntryPrev.type === 'retorno') || (normalEntriesPrev.length % 2 !== 0 && lastEntryPrev.type !== 'saida' && lastEntryPrev.type !== 'intervalo'));
                 
                 if (isNightShift || (lastHourPrev >= 18 && seemsIncompletePrev)) {
                     const nextDay = addDays(prevDay, 1);
                     const nextKey = format(nextDay, 'yyyy-MM-dd');
                     const nextDayEntries = entriesByDay.get(nextKey) || [];
                     const lookAheadLimit = isNightShift ? 14 : 6;
                     const nextDayShiftEntries = nextDayEntries.filter(e => new Date(e.timestamp).getHours() < lookAheadLimit);
                     nextDayShiftEntries.forEach(e => consumedEntryIds.add(e.id));
                 }
             }

             const isId3 = empCode === '3';
             const isId2 = empCode === '2';
             // Match Espelho: IDs 2 and 3 follow alternating Saturday rules
             const isSaturdayAlternating = isId2;
             const isSaturdayMorning = empCode === '6';

             for (const day of daysInMonth) {
                 const key = format(day, 'yyyy-MM-dd');
                 const dow = getDay(day);
                 
                 let dayEntries = entriesByDay.get(key) || [];
                 dayEntries = dayEntries.filter(e => !consumedEntryIds.has(e.id));
                 
                 const hasAnyEntry = dayEntries.length > 0;
                 const isPast = day.getTime() < todayStart.getTime();

                 // --- Expected Minutes Calculation (Synced with Espelho) ---
                 let expectedMinutes = 0;
                 if (isCustomWeekly && customSchedule) {
                     const cfg = customSchedule[String(dow)];
                     if (cfg?.start && cfg?.end) {
                         const [h1, m1] = cfg.start.split(':').map(Number);
                         const [h2, m2] = cfg.end.split(':').map(Number);
                         let totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
                         if (totalMins < 0) totalMins += 1440;
                         // Deduct break if > 6h
                         expectedMinutes = totalMins > 360 ? totalMins - 60 : totalMins;
                         if (expectedMinutes < 0) expectedMinutes = 0;
                     }
                 } else if (isSegSex716Sab812) {
                     if (dow >= 1 && dow <= 5) expectedMinutes = 480; // 8h
                     else if (dow === 6) expectedMinutes = 240; // 4h
                     else expectedMinutes = 0;
                 } else if (is4hMorning) {
                     if (dow >= 1 && dow <= 5) expectedMinutes = 240;
                     else expectedMinutes = 0;
                 } else if (isSegQuiSab716Sex711) {
                     if (dow >= 1 && dow <= 4) expectedMinutes = 480;
                     else if (dow === 5) expectedMinutes = 240;
                     else if (dow === 6) expectedMinutes = 480;
                     else expectedMinutes = 0;
                 } else if (is12x36) {
                     if (['12','32','10','31','13','28','11','26','5','22','14','24','25'].includes(empCode)) {
                         expectedMinutes = hasAnyEntry ? 660 : 0;
                     } else {
                         expectedMinutes = Math.abs(differenceInCalendarDays(day, anchorDay)) % 2 === 0 ? 660 : 0;
                     }
                 } else if (is3hAlternating) {
                     if (dow === 0) expectedMinutes = 0;
                     else expectedMinutes = Math.abs(differenceInCalendarDays(day, anchorDay)) % 2 === 0 ? 180 : 0;
                 } else if (is3hMorning) {
                     if (dow >= 1 && dow <= 5) expectedMinutes = 180;
                     else if (dow === 6 && hasSaturdayWork) expectedMinutes = 180;
                     else expectedMinutes = 0;
                 } else if (isSegSex08_11) {
                     if (dow >= 1 && dow <= 5) expectedMinutes = 180;
                     else expectedMinutes = 0;
                 } else if (isSegSex08_12) {
                     if (dow >= 1 && dow <= 5) expectedMinutes = 240;
                     else expectedMinutes = 0;
                 } else if (isSegSex08_18Sab812) {
                     if (dow >= 1 && dow <= 5) expectedMinutes = 480;
                     else if (dow === 6) expectedMinutes = 240;
                     else expectedMinutes = 0;
                 } else if (isSegDom0630_1550) {
                     expectedMinutes = 440;
                 } else {
                     // Default / Standard 09-18
                     if (dow === 0) {
                         expectedMinutes = 0;
                     } else if (dow === 6) {
                         if (isSaturdayAlternating) {
                             // Match Espelho: If alternating, expect 8h ONLY if they worked (dayEntries > 0)
                             expectedMinutes = dayEntries.length > 0 ? 480 : 0;
                         } else if (isSaturdayMorning) {
                             expectedMinutes = 240;
                         } else {
                             expectedMinutes = hasSaturdayWork ? 240 : 0;
                         }
                     } else {
                         expectedMinutes = 480;
                     }
                 }
                 const shouldWork = expectedMinutes > 0;

                 // --- Entries Processing (Lookahead + Sorting + Deduplication) ---
                 const hasAbono = dayEntries.some(e => e.type === 'abono');
                 let normalEntries = hasAbono ? [] : dayEntries.filter(e => e.type !== 'abono');
                 const lastEntry = normalEntries[normalEntries.length - 1];
                 const lastHour = lastEntry ? new Date(lastEntry.timestamp).getHours() : 0;
                 const seemsIncomplete = lastEntry && ((lastEntry.type === 'entrada' || lastEntry.type === 'retorno') || (normalEntries.length % 2 !== 0 && lastEntry.type !== 'saida' && lastEntry.type !== 'intervalo'));
                 
                 let lookedAheadEntries: TimeEntryRow[] = [];
                 if ((isNightShift || (lastHour >= 18 && seemsIncomplete)) && normalEntries.length > 0) {
                     const nextDay = addDays(day, 1);
                     const nextKey = format(nextDay, 'yyyy-MM-dd');
                     const nextDayEntries = entriesByDay.get(nextKey) || [];
                     const lookAheadLimit = isNightShift ? 14 : 6;
                     const nextDayShiftEntries = nextDayEntries.filter(e => new Date(e.timestamp).getHours() < lookAheadLimit && !consumedEntryIds.has(e.id));
                     if (nextDayShiftEntries.length > 0) {
                         nextDayShiftEntries.forEach(e => consumedEntryIds.add(e.id));
                         normalEntries.push(...nextDayShiftEntries);
                         lookedAheadEntries = nextDayShiftEntries;
                     }
                 }

                 const uniqueMap = new Map();
                 normalEntries.forEach(e => uniqueMap.set(new Date(e.timestamp).getTime(), e));
                 normalEntries = Array.from(uniqueMap.values());

                 // Fix mis-dated night shift exits
                 const startEntry = normalEntries.find(e => (e.type === 'entrada' || e.type === 'retorno') && new Date(e.timestamp).getHours() >= 18);
                 if (startEntry) {
                     normalEntries.forEach(e => {
                         const d = new Date(e.timestamp);
                         if (d.getHours() < 13 && d.getTime() < new Date(startEntry.timestamp).getTime()) {
                             e.timestamp = addDays(d, 1).toISOString();
                         }
                     });
                 }
                 normalEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                 // --- Assignment Logic ---
                 const usedIds = new Set<string>();
                 let entrada1 = normalEntries.find(e => e.type === 'entrada');
                 if (entrada1) usedIds.add(entrada1.id);
                 let saida1 = normalEntries.find(e => e.type === 'intervalo' && !usedIds.has(e.id));
                 if (saida1) usedIds.add(saida1.id);
                 let entrada2 = normalEntries.find(e => e.type === 'retorno' && !usedIds.has(e.id));
                 if (entrada2) usedIds.add(entrada2.id);
                 let saida2 = normalEntries.slice().reverse().find(e => e.type === 'saida' && !usedIds.has(e.id));
                 if (saida2) usedIds.add(saida2.id);

                 const unusedEntries = normalEntries.filter(e => !usedIds.has(e.id));
                 const consumeNextUnused = (afterTime?: number) => {
                     const idx = unusedEntries.findIndex(e => (!afterTime || new Date(e.timestamp).getTime() > afterTime));
                     if (idx !== -1) {
                         const entry = unusedEntries[idx];
                         unusedEntries.splice(idx, 1);
                         usedIds.add(entry.id);
                         return entry;
                     }
                 };

                 if (!entrada1) entrada1 = consumeNextUnused();
                 const t1Time = entrada1 ? new Date(entrada1.timestamp).getTime() : 0;
                 if (!saida1) saida1 = consumeNextUnused(t1Time);
                 const t2Time = saida1 ? new Date(saida1.timestamp).getTime() : t1Time;
                 if (!entrada2) entrada2 = consumeNextUnused(t2Time);
                 const t3Time = entrada2 ? new Date(entrada2.timestamp).getTime() : t2Time;
                 if (!saida2) saida2 = consumeNextUnused(t3Time);

                 if (!saida2 && unusedEntries.length > 0) {
                     const morningExitIndex = unusedEntries.findIndex(e => new Date(e.timestamp).getHours() < 13);
                     if (morningExitIndex !== -1) {
                         saida2 = unusedEntries[morningExitIndex];
                         unusedEntries.splice(morningExitIndex, 1);
                         usedIds.add(saida2.id);
                     }
                 }

                 if ((is4hMorning || is3hMorning || isSegSex08_12 || is3hAlternating) && entrada1 && saida2 && !saida1 && !entrada2) {
                     saida1 = saida2; saida2 = undefined;
                 }

                 // --- Worked Minutes Calculation ---
                 let workedMinutes = 0;
                 const calcPair = (e1?: TimeEntryRow, e2?: TimeEntryRow) => {
                     if (e1 && e2) {
                         const s = new Date(e1.timestamp);
                         let e = new Date(e2.timestamp);
                         if (e.getTime() < s.getTime()) e = addDays(e, 1);
                         return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
                     }
                     return 0;
                 };

                 workedMinutes += calcPair(entrada1, saida1);
                 workedMinutes += calcPair(entrada2, saida2);
                 
                 if (entrada1 && saida2 && !saida1 && !entrada2 && normalEntries.length <= 2) {
                     workedMinutes += calcPair(entrada1, saida2);
                 }

                 const extrasMinutes = shouldWork ? Math.max(0, workedMinutes - expectedMinutes) : workedMinutes;
                 totalExtras += extrasMinutes;

                 // Clean up consumed IDs for next iteration if they were used for lookahead
                 if (lookedAheadEntries.length > 0) {
                     lookedAheadEntries.forEach(e => {
                         if (!usedIds.has(e.id)) consumedEntryIds.delete(e.id);
                     });
                 }
             }

             rows.push({
                 name: emp.name,
                cpf: emp.cpf,
                extras: (() => {
                    const h = Math.floor(totalExtras / 60);
                    const m = Math.round(totalExtras % 60);
                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                })()
            });
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(16);
        doc.text(`Relatório de Horas Extras - ${format(startPeriod, 'MM/yyyy')}`, 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Empresa: ${company.name}`, 14, 30);
        doc.text(`CNPJ: ${company.cnpj}`, 14, 35);

        let y = 45;
        doc.setLineWidth(0.1);
        doc.line(14, 40, 196, 40);

        // Table Header
        doc.setFont('helvetica', 'bold');
        doc.text("Funcionário", 14, y);
        doc.text("CPF", 120, y);
        doc.text("Total Extras (h)", 170, y);
        y += 5;
        doc.line(14, y, 196, y);
        y += 7;

        // Table Body
        doc.setFont('helvetica', 'normal');
        for (const row of rows) {
            doc.text(row.name.substring(0, 40), 14, y);
            doc.text(cleanDoc(row.cpf || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'), 120, y);
            doc.text(row.extras, 175, y);
            y += 7;
        }

        doc.save(`Relatorio_Extras_${format(startPeriod, 'yyyy-MM')}.pdf`);

    } catch (error: unknown) {
        console.error("Erro ao gerar Relatório de Extras:", error);
        throw error;
    }
};
