
import { supabase } from "./src/lib/supabase";

async function checkColumns() {
    const { data, error } = await supabase.from('employees').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("No employees found, can't check columns.");
        }
    }
}

checkColumns();
