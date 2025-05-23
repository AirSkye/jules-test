import fs from 'fs/promises';
import path from 'path';

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

// Resolve RULES_DIR relative to the compiled JS file in dist, hence '..' three times for 'dist/services/file.js' to root
// For local development with ts-node, it might be relative to src.
// A more robust way might involve using an environment variable or a configuration file.
const isTsNode = process.env[Symbol.for("ts-node.register.instance")];
const baseDir = isTsNode ? path.resolve(__dirname, '..', '..') : path.resolve(__dirname, '..', '..', '..');
export const RULES_DIR = path.join(baseDir, 'rules');


export async function ensureRulesDirExists(): Promise<void> {
  try {
    await fs.mkdir(RULES_DIR, { recursive: true });
    // console.log(`Rules directory ensured: ${RULES_DIR}`);
  } catch (error) {
    console.error(`Error creating rules directory '${RULES_DIR}':`, error);
    throw error; // Re-throw to indicate failure at a higher level if needed
  }
}

// Helper function to get the full path to a rule file
export function getRuleFilePath(ruleId: string): string {
  if (!ruleId.match(/^[a-zA-Z0-9_.-]+$/)) {
    throw new Error(`Invalid ruleId format: ${ruleId}`);
  }
  return path.join(RULES_DIR, `${ruleId}.json`);
}

export async function getAllRules(): Promise<Rule[]> {
  await ensureRulesDirExists();
  try {
    const files = await fs.readdir(RULES_DIR);
    const rulePromises = files
      .filter(file => file.endsWith('.json'))
      .map(async (file) => {
        const filePath = path.join(RULES_DIR, file);
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const rule = JSON.parse(fileContent) as Rule;
          // Optional: Validate rule structure here if needed
          if (path.basename(file, '.json') !== rule.id) {
            console.warn(`Rule ID in file ${file} does not match filename. Skipping.`);
            return null;
          }
          return rule;
        } catch (parseError) {
          console.error(`Error parsing JSON from file ${filePath}:`, parseError);
          return null; // Skip invalid JSON files
        }
      });

    const results = await Promise.all(rulePromises);
    return results.filter(rule => rule !== null) as Rule[];
  } catch (error) {
    console.error('Error reading rules directory:', error);
    return []; // Return empty array or throw error as per desired error handling
  }
}

export async function getRuleById(ruleId: string): Promise<Rule | null> {
  await ensureRulesDirExists();
  try {
    const filePath = getRuleFilePath(ruleId);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const rule = JSON.parse(fileContent) as Rule;
     // Validate that the ID in the file matches the requested ruleId (filename)
    if (rule.id !== ruleId) {
        console.warn(`Rule ID '${rule.id}' in file does not match requested ruleId '${ruleId}'.`);
        return null; 
    }
    return rule;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // File not found
    }
    console.error(`Error reading rule file for ID ${ruleId}:`, error);
    return null; // Other errors
  }
}

export async function createRule(ruleData: Rule): Promise<Rule> {
  await ensureRulesDirExists();
  const filePath = getRuleFilePath(ruleData.id);

  try {
    // Check if file already exists (fs.access is discouraged for this, use open with 'wx' flag or try reading)
    await fs.readFile(filePath); 
    // If readFile succeeds, file exists
    throw new Error(`Rule ID '${ruleData.id}' already exists.`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') { // If error is not "file not found", then it's some other issue or file exists
        if (error.message.includes('already exists')) throw error; // re-throw our specific error
        // Otherwise, it could be a different error during readFile, which we don't expect here
        // unless it's a permissions issue or something similar. For creation, we only care about ENOENT.
        console.warn(`Unexpected error when checking if rule exists, proceeding with caution: ${error.message}`);
    }
    // If code is 'ENOENT', file does not exist, which is good for creation.
  }
  
  // Ensure the ID in the data matches the intended filename ID
  if (ruleData.id !== path.basename(filePath, '.json')) {
      throw new Error(`Rule data ID '${ruleData.id}' must match the ID derived from the filename '${path.basename(filePath, '.json')}'.`);
  }

  try {
    await fs.writeFile(filePath, JSON.stringify(ruleData, null, 2), 'utf-8');
    return ruleData;
  } catch (writeError) {
    console.error(`Error writing rule file for ID ${ruleData.id}:`, writeError);
    throw writeError; // Re-throw to be handled by the route
  }
}

export async function updateRule(ruleId: string, ruleUpdateData: Partial<Rule>): Promise<Rule | null> {
  await ensureRulesDirExists();
  const filePath = getRuleFilePath(ruleId);

  try {
    const existingRule = await getRuleById(ruleId); // Re-use getRuleById to read and parse
    if (!existingRule) {
      return null; // Rule not found
    }

    // Prevent changing ID via update. Filename (ruleId) is the source of truth for ID.
    // Language might also be tied to ruleId prefix, consider if it should be immutable.
    const { id: updatedId, language: updatedLanguage, ...validUpdateData } = ruleUpdateData;
    if (updatedId && updatedId !== ruleId) {
        console.warn(`Attempted to change rule ID from '${ruleId}' to '${updatedId}'. ID is immutable and will not be changed.`);
    }
    // Potentially add similar check for language if it's part of the ID convention (e.g. java_001)

    const updatedRule: Rule = { ...existingRule, ...validUpdateData };
    
    // Ensure the ID in the data being written matches the filename ID
    if (updatedRule.id !== ruleId) {
        console.warn(`Correcting rule ID in data from '${updatedRule.id}' to match filename ID '${ruleId}'.`);
        updatedRule.id = ruleId;
    }

    await fs.writeFile(filePath, JSON.stringify(updatedRule, null, 2), 'utf-8');
    return updatedRule;
  } catch (error) {
    console.error(`Error updating rule file for ID ${ruleId}:`, error);
    throw error; // Re-throw to be handled by the route
  }
}

export async function deleteRule(ruleId: string): Promise<boolean> {
  await ensureRulesDirExists();
  const filePath = getRuleFilePath(ruleId);

  try {
    await fs.unlink(filePath);
    return true;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return false; // File not found, so considered "successfully" deleted in a way
    }
    console.error(`Error deleting rule file for ID ${ruleId}:`, error);
    throw error; // Re-throw for other errors
  }
}

export async function toggleRuleStatus(ruleId: string): Promise<Rule | null> {
  const rule = await getRuleById(ruleId); // ensureRulesDirExists is called by getRuleById
  if (!rule) {
    return null;
  }

  const updatedRule = { ...rule, enabled: !rule.enabled };
  
  // Need to use the original ruleId for the filepath, not updatedRule.id if it were changeable
  const filePath = getRuleFilePath(ruleId); 
  try {
    await fs.writeFile(filePath, JSON.stringify(updatedRule, null, 2), 'utf-8');
    return updatedRule;
  } catch (error) {
    console.error(`Error toggling status for rule ID ${ruleId}:`, error);
    throw error;
  }
}

// Call once at service initialization (though individual functions also call it for safety)
ensureRulesDirExists().catch(error => {
    console.error("Failed to ensure rules directory exists on service module load:", error);
    // Depending on application requirements, might want to exit or have a retry mechanism
});
