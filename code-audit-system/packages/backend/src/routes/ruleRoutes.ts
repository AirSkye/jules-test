import { Router, Request, Response } from 'express';
import * as ruleFileService from '../services/ruleFileService';
import type { Rule } from '../services/ruleFileService'; // Import the Rule type

const router: Router = Router();

// GET /api/rules - Get all rules
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const rules = await ruleFileService.getAllRules();
    res.json(rules);
  } catch (error) {
    console.error('Error getting all rules:', error);
    res.status(500).json({ message: 'Error retrieving rules' });
  }
});

// GET /api/rules/:id - Get a single rule by ID
router.get('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await ruleFileService.getRuleById(id);
    if (rule) {
      res.json(rule);
    } else {
      res.status(404).json({ message: `Rule with ID '${id}' not found.` });
    }
  } catch (error: any) {
    if (error.message?.includes('Invalid ruleId format')) {
        return res.status(400).json({ message: error.message });
    }
    console.error(`Error getting rule by ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error retrieving rule' });
  }
});

// POST /api/rules - Create a new rule
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const newRuleData: Rule = req.body;

    // Basic validation
    if (!newRuleData.id || !newRuleData.language || !newRuleData.name || !newRuleData.pattern || !newRuleData.severity) {
      return res.status(400).json({ message: 'Missing required rule fields (id, language, name, pattern, severity).' });
    }
    if (newRuleData.id !== req.body.id) { // Ensure ID in body matches path param if it were part of path, good practice
        return res.status(400).json({ message: 'Rule ID in body must match ID for creation if conventions require.' });
    }


    const createdRule = await ruleFileService.createRule(newRuleData);
    res.status(201).json(createdRule);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    if (error.message?.includes('Invalid ruleId format')) {
        return res.status(400).json({ message: error.message });
    }
    console.error('Error creating rule:', error);
    res.status(500).json({ message: 'Error creating rule' });
  }
});

// PUT /api/rules/:id - Update an existing rule
router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ruleUpdateData: Partial<Rule> = req.body;

    // Prevent changing the ID via the request body
    if (ruleUpdateData.id && ruleUpdateData.id !== id) {
        return res.status(400).json({ message: `Rule ID in body ('${ruleUpdateData.id}') cannot differ from ID in path ('${id}').` });
    }
    // Remove id from update data to prevent issues if service logic doesn't already handle it
    const { id: bodyId, ...updateData } = ruleUpdateData;


    const updatedRule = await ruleFileService.updateRule(id, updateData);
    if (updatedRule) {
      res.json(updatedRule);
    } else {
      res.status(404).json({ message: `Rule with ID '${id}' not found for update.` });
    }
  } catch (error: any) {
     if (error.message?.includes('Invalid ruleId format')) {
        return res.status(400).json({ message: error.message });
    }
    console.error(`Error updating rule ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error updating rule' });
  }
});

// DELETE /api/rules/:id - Delete a rule
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await ruleFileService.deleteRule(id);
    if (success) {
      res.status(204).send(); // No content
    } else {
      // This case might not be reached if deleteRule throws for non-ENOENT errors
      // and returns false only for ENOENT (file not found).
      // If it returns false for "not found", then 404 is appropriate.
      res.status(404).json({ message: `Rule with ID '${id}' not found for deletion.` });
    }
  } catch (error: any) {
    if (error.message?.includes('Invalid ruleId format')) {
        return res.status(400).json({ message: error.message });
    }
    console.error(`Error deleting rule ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error deleting rule' });
  }
});

// PATCH /api/rules/:id/toggle - Toggle enable/disable status
router.patch('/rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedRule = await ruleFileService.toggleRuleStatus(id);
    if (updatedRule) {
      res.json(updatedRule);
    } else {
      res.status(404).json({ message: `Rule with ID '${id}' not found for status toggle.` });
    }
  } catch (error: any) {
    if (error.message?.includes('Invalid ruleId format')) {
        return res.status(400).json({ message: error.message });
    }
    console.error(`Error toggling rule status for ${req.params.id}:`, error);
    res.status(500).json({ message: 'Error toggling rule status' });
  }
});

export default router;
