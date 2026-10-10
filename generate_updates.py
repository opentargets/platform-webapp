#!/usr/bin/env python3
import os
import re

ALREADY_UPDATED = {
    'packages/sections/src/disease/Ontology/Body.jsx',
    'packages/sections/src/disease/Phenotypes/Body.jsx',
    'packages/sections/src/disease/OTProjects/Body.jsx',
    'packages/sections/src/variant/EnhancerToGenePredictions/Body.tsx',
    'packages/sections/src/variant/QTLCredibleSets/Body.tsx',
}

body_files = []
for root, dirs, files in os.walk('packages/sections/src'):
    for file in files:
        if file in ('Body.jsx', 'Body.tsx'):
            path = os.path.join(root, file)
            if path not in ALREADY_UPDATED:
                body_files.append(path)

body_files.sort()
updates = []

for filepath in body_files:
    with open(filepath, 'r') as f:
        lines = f.readlines()
        full_content = ''.join(lines)
    
    # Find full import line(s)
    import_line_idx = -1
    for idx, line in enumerate(lines):
        if 'import' in line and 'from "ui"' in line:
            import_line_idx = idx
            break
    
    if import_line_idx == -1:
        continue
    
    # Get full import block (might span multiple lines)
    import_lines = []
    for idx in range(import_line_idx, min(import_line_idx + 5, len(lines))):
        import_lines.append(lines[idx].rstrip('\n'))
        if 'from "ui"' in lines[idx]:
            break
    
    full_import = '\n'.join(import_lines)
    
    # Extract the imports list
    import_match = re.search(r'import\s*{([^}]+)}\s*from\s*["\']ui["\']', full_content, re.DOTALL)
    if not import_match:
        continue
    
    imports_raw = import_match.group(1).strip()
    if 'useReportSectionContext' in imports_raw:
        continue
    
    # Find function signature
    func_match = re.search(r'(export\s+)?(function|const)\s+(Body|Section)\s*\(([^)]+)\)', full_content)
    if not func_match:
        continue
    
    func_keyword = func_match.group(2)
    func_name = func_match.group(3)
    params_str = func_match.group(4).strip()
    
    # Determine fallback assignments
    assignments = []
    
    # Check for various ID patterns
    if 'efoId' in params_str:
        assignments.append('efoId = reportContext?.entityId || efoId;')
    elif 'ensgId' in params_str:
        assignments.append('ensgId = reportContext?.entityId || ensgId;')
    elif 'ensemblId' in params_str:
        assignments.append('ensemblId = reportContext?.entityId || ensemblId;')
    elif 'chemblId' in params_str:
        assignments.append('chemblId = reportContext?.entityId || chemblId;')
    elif 'studyId' in params_str:
        assignments.append('studyId = reportContext?.entityId || studyId;')
    
    # Check for label patterns
    if re.search(r'label\s*:\s*(\w+)', params_str):
        match = re.search(r'label\s*:\s*(\w+)', params_str)
        label_var = match.group(1)
        assignments.append(f'{label_var} = reportContext?.entityLabel || {label_var};')
    elif 'name' in params_str and 'label:' in params_str:
        assignments.append('name = reportContext?.entityLabel || name;')
    elif 'symbol' in params_str and 'label' not in params_str:
        assignments.append('symbol = reportContext?.entityLabel || symbol;')
    elif 'diseaseName' in params_str:
        assignments.append('diseaseName = reportContext?.entityLabel || diseaseName;')
    
    # Build insert code
    insert_lines = ['const reportContext = useReportSectionContext();']
    for assignment in assignments:
        insert_lines.append(assignment)
    insert_code = '\n  '.join(insert_lines)
    
    # Build new import
    imports_list = [imp.strip() for imp in imports_raw.split(',')]
    if 'useReportSectionContext' not in imports_list:
        imports_list.append('useReportSectionContext')
    
    new_imports_str = ', '.join(imports_list)
    new_import_line = f'import {{ {new_imports_str} }} from "ui";'
    
    updates.append({
        'file': filepath,
        'old_import': full_import,
        'new_import': new_import_line,
        'func_sig': f'{func_keyword} {func_name}({params_str}) {{',
        'insert_code': insert_code,
        'assignments': assignments
    })

# Print formatted output
print(f"# Detailed Body File Update Instructions\n")
print(f"**Total files to update: {len(updates)}**\n")

for idx, update in enumerate(updates, 1):
    print(f"\n{'='*100}")
    print(f"{idx}. {update['file']}")
    print(f"{'='*100}")
    
    print(f"\n**OLD IMPORT LINE:**")
    print(f"```")
    print(update['old_import'])
    print(f"```")
    
    print(f"\n**NEW IMPORT LINE:**")
    print(f"```")
    print(update['new_import'])
    print(f"```")
    
    print(f"\n**FUNCTION SIGNATURE:**")
    print(f"```")
    print(update['func_sig'])
    print(f"```")
    
    print(f"\n**INSERT AFTER OPENING BRACE:**")
    print(f"```")
    print(f"  {update['insert_code']}")
    print(f"```")
