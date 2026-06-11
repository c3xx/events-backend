-- 010_check_workflow_template_step_not_last.sql
--
-- todo: this needs to be fixed
--
-- prevent deletion of the last remaining step in a workflow_template
-- that is assigned to an event_type

CREATE OR REPLACE FUNCTION check_workflow_template_step_not_last()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM event_type
        WHERE workflow_template_id = OLD.workflow_template_id
    ) THEN
        RETURN OLD;
    END IF;

    IF OLD.next_step_id IS NULL
    AND NOT EXISTS (
        SELECT 1
        FROM workflow_template_step
        WHERE template_id = OLD.template_id
        AND next_step_id = OLD.id
    ) THEN
        RAISE EXCEPTION
            'workflow_template_step: cannot delete the last step of workflow_template % assigned to an event type',
            OLD.workflow_template_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_workflow_template_step_not_last ON workflow_template_step;

---split---
CREATE TRIGGER trg_check_workflow_template_step_not_last
BEFORE DELETE
ON workflow_template_step
FOR EACH ROW EXECUTE FUNCTION check_workflow_template_step_not_last();
