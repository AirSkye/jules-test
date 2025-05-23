import { reactive, readonly } from 'vue';

export interface Rule {
  id: string;
  language: string;
  name: string;
  description: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  tags: string[];
  pattern: string;
  remediation: string;
  enabled: boolean;
}

const initialMockRules: Rule[] = [
  { id: 'java_001', language: 'java', name: 'SQL Injection Detection', description: 'Detects potential SQL injection vulnerabilities', severity: 'high', tags: ['sqli', 'database', 'injection'], pattern: 'String query = "SELECT * FROM users WHERE username = \'" + userInput + "\'";', remediation: 'Use prepared statements', enabled: true },
  { id: 'py_001', language: 'python', name: 'XSS in Jinja2 Templates', description: 'Detects Cross-Site Scripting in Python Jinja2 templates', severity: 'medium', tags: ['xss', 'web', 'python'], pattern: 'import os\n# Example: Potential command injection\ncommand = "ls -l " + user_input\nos.system(command)', remediation: 'Use autoescaping and sanitize input.', enabled: true },
  { id: 'js_001', language: 'javascript', name: 'Insecure Randomness', description: 'Detects use of Math.random() for security purposes', severity: 'low', tags: ['crypto', 'javascript'], pattern: 'function generateToken() {\n  return Math.random().toString(36).substring(2);\n}', remediation: 'Use crypto.getRandomValues() or a secure library for token generation.', enabled: false },
  { id: 'scala_cpg_001', language: 'scala', name: 'CPG: Finding all literals', description: 'Joern CPG query to find all literals', severity: 'info', tags: ['cpg', 'scala', 'joern'], pattern: 'cpg.literal.toJsonPretty', remediation: 'N/A', enabled: true },
  { id: 'java_002', language: 'java', name: 'Hardcoded Credentials', description: 'Finds hardcoded passwords or API keys', severity: 'high', tags: ['security', 'credentials'], pattern: 'private final String API_KEY = "your_hardcoded_api_key";', remediation: 'Store credentials securely using environment variables or a secrets management system.', enabled: true },
  { id: 'csharp_001', language: 'csharp', name: 'Path Traversal', description: 'Detects potential path traversal vulnerabilities when handling file paths.', severity: 'medium', tags: ['file', 'security', 'csharp'], pattern: 'string path = Request.QueryString["filePath"];\nSystem.IO.File.ReadAllText(path);', remediation: 'Sanitize user input for file paths and use Path.GetFullPath to normalize paths.', enabled: true },
  { id: 'go_001', language: 'go', name: 'Unbuffered Channel Risk', description: 'Detects unbuffered channels that might lead to deadlocks if not handled correctly.', severity: 'low', tags: ['concurrency', 'go'], pattern: 'ch := make(chan int)\ngo func() {\n\tch <- 1 // Potential block if no receiver\n}()', remediation: 'Use buffered channels or ensure proper goroutine synchronization for send/receive operations.', enabled: false },
  { id: 'java_003', language: 'java', name: 'XML External Entity (XXE)', description: 'Detects XXE vulnerabilities in XML parsers.', severity: 'high', tags: ['xxe', 'xml', 'java'], pattern: 'DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();\nDocumentBuilder db = dbf.newDocumentBuilder();\nDocument doc = db.parse(new InputSource(new StringReader(xmlInput)));', remediation: 'Disable DTDs, external entities, and use secure XML parsing configurations.', enabled: true },
  { id: 'python_002', language: 'python', name: 'Deserialization of Untrusted Data (pickle)', description: 'Detects use of pickle for deserializing untrusted data.', severity: 'high', tags: ['deserialization', 'security', 'python'], pattern: 'import pickle\n\ndata = pickle.loads(user_controlled_input)', remediation: 'Avoid using pickle for untrusted data. Use safer serialization formats like JSON if possible, or implement strict validation.', enabled: true },
  { id: 'js_002', language: 'javascript', name: 'Use of eval()', description: 'Detects potentially dangerous use of eval() with dynamic input.', severity: 'medium', tags: ['javascript', 'security', 'injection'], pattern: 'let code = request.getParameter("code");\neval(code);', remediation: 'Avoid eval(). Use safer alternatives like JSON.parse for data parsing, or function constructors if dynamic code execution is absolutely necessary and input is sanitized.', enabled: true },
];

const mockRules = reactive<Rule[]>([...initialMockRules]);

export function getAllRules(): Rule[] {
  return readonly(mockRules) as Rule[]; // Expose as readonly to encourage use of store functions for modification
}

export function getRuleById(id: string): Rule | undefined {
  return readonly(mockRules.find(rule => rule.id === id)) as Rule | undefined;
}

export function addRule(rule: Rule): { success: boolean; message?: string } {
  if (mockRules.some(r => r.id === rule.id)) {
    return { success: false, message: `Rule with ID '${rule.id}' already exists.` };
  }
  mockRules.push(JSON.parse(JSON.stringify(rule))); // Add a deep copy
  return { success: true };
}

export function updateRule(id: string, updatedRuleData: Partial<Rule>): boolean {
  const index = mockRules.findIndex(rule => rule.id === id);
  if (index !== -1) {
    // Ensure ID is not changed if it's part of updatedRuleData
    const { id: newId, ...restOfData } = updatedRuleData;
    mockRules[index] = { ...mockRules[index], ...restOfData };
    return true;
  }
  return false;
}

export function deleteRule(id: string): boolean {
  const index = mockRules.findIndex(rule => rule.id === id);
  if (index !== -1) {
    mockRules.splice(index, 1);
    return true;
  }
  return false;
}

export function toggleRuleStatus(id: string): boolean {
  const rule = mockRules.find(rule => rule.id === id);
  if (rule) {
    rule.enabled = !rule.enabled;
    return true;
  }
  return false;
}

// For import functionality
export function addMultipleRules(rulesToAdd: Rule[], overwriteExisting: boolean = false): { importedCount: number, errors: string[] } {
  let importedCount = 0;
  const errors: string[] = [];

  rulesToAdd.forEach(newRule => {
    if (!newRule.id || !newRule.name || !newRule.language || !newRule.pattern || !newRule.severity) {
        errors.push(`Rule missing required fields (id, name, language, pattern, severity): ${JSON.stringify(newRule)}`);
        return;
    }
    
    const existingRuleIndex = mockRules.findIndex(r => r.id === newRule.id);
    if (existingRuleIndex !== -1) {
      if (overwriteExisting) {
        mockRules[existingRuleIndex] = { ...newRule }; // Deep copy
        importedCount++;
      } else {
        errors.push(`Rule ID '${newRule.id}' already exists. Skipped.`);
      }
    } else {
      mockRules.push({ ...newRule }); // Deep copy
      importedCount++;
    }
  });
  return { importedCount, errors };
}
```
