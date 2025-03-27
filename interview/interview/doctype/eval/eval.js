// Copyright (c) 2025, usama and contributors
// For license information, please see license.txt

frappe.ui.form.on('eval', {
    multi_select_field: function (frm) {
        if (frm.doc.multi_select_field) {
            let selected_groups = frm.doc?.multi_select_field  
            frm.clear_table('selected_field_row_table');  
            selected_groups.forEach(group => {
                let row = frm.add_child('selected_field_row_table');  
                row.user = group.user;  
            });

            frm.refresh_field('selected_field_row_table');  
        }
    }
});
