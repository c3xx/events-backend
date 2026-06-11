-- 009_check_workflow_template_has_step.sql
--
-- prevent assigning a workflow_template to an event_type if the workflow_template has no steps

CREATE OR REPLACE FUNCTION check_workflow_template_has_step()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM workflow_template_step
        WHERE template_id = NEW.workflow_template_id
    ) THEN
        RAISE EXCEPTION
            'workflow_template % must have at least one step before being assigned to an event type',
            NEW.workflow_template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_workflow_template_has_step ON event_type;

---split---
CREATE TRIGGER trg_check_workflow_template_has_step
BEFORE INSERT OR UPDATE OF workflow_template_id
ON event_type
FOR EACH ROW EXECUTE FUNCTION check_workflow_template_has_step();
