-- Verificar configuração da funcionária Dayse
SELECT e.id, e.name, e.code, e.shift_type, ws.name as shift_name, ws.type as shift_type_db, ws.schedule_json
FROM employees e
LEFT JOIN work_shifts ws ON e.work_shift_id = ws.id
WHERE e.code = '3' OR e.name ILIKE '%Dayse%';

-- Verificar totais de horas no banco (apenas para debug)
SELECT 
    employee_id,
    SUM(EXTRACT(EPOCH FROM (saida - entrada))/60) as total_worked_minutes
FROM (
    -- Esta query é simplificada e não substitui a lógica complexa do código
    SELECT 
        employee_id,
        timestamp as entrada,
        LEAD(timestamp) OVER (PARTITION BY employee_id ORDER BY timestamp) as saida
    FROM time_entries
    WHERE timestamp >= '2026-01-01' AND timestamp < '2026-02-01'
) t
WHERE 
    EXTRACT(HOUR FROM entrada) < EXTRACT(HOUR FROM saida) -- Ignora pares inválidos simplificados
GROUP BY employee_id;
