-- 012_check_workflow_template_next_step_belongs.sql
--
-- prevent setting next_step_id to a step that does not belong to the same workflow_template

CREATE OR REPLACE FUNCTION check_workflow_template_next_step_belongs()
RETURNS TRIGGER AS $$
DECLARE
    next_step_workflow_template_id INTEGER;
BEGIN
    IF NEW.next_step_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT template_id INTO next_step_workflow_template_id
    FROM workflow_template_step
    WHERE id = NEW.next_step_id;

    IF next_step_workflow_template_id IS NULL THEN
        RAISE EXCEPTION
            'workflow_template_step: next_step % does not exist',
            NEW.next_step_id;
    END IF;

    IF next_step_workflow_template_id != NEW.template_id THEN
        RAISE EXCEPTION
            'workflow_template_step: next_step % belongs to workflow_template %, not workflow_template %',
            NEW.next_step_id,
            next_step_workflow_template_id,
            NEW.template_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_workflow_template_next_step_belongs ON workflow_template_step;

---split---
CREATE TRIGGER trg_check_workflow_template_next_step_belongs
BEFORE INSERT OR UPDATE OF next_step_id
ON workflow_template_step
FOR EACH ROW EXECUTE FUNCTION check_workflow_template_next_step_belongs();
