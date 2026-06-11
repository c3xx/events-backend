-- 011_check_workflow_template_initial_step_belongs.sql
--
-- prevent setting initial_step_id to a step that does not belong to this workflow_template

CREATE OR REPLACE FUNCTION check_workflow_template_initial_step_belongs()
RETURNS TRIGGER AS $$
DECLARE
    step_workflow_template_id INTEGER;
BEGIN
    IF NEW.initial_step_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT template_id INTO step_workflow_template_id
    FROM workflow_template_step
    WHERE id = NEW.initial_step_id;

    IF step_workflow_template_id IS NULL THEN
        RAISE EXCEPTION
            'workflow_template: initial_step % does not exist',
            NEW.initial_step_id;
    END IF;

    IF step_workflow_template_id != NEW.id THEN
        RAISE EXCEPTION
            'workflow_template: initial_step % belongs to workflow_template %, not workflow_template %',
            NEW.initial_step_id,
            step_workflow_template_id,
            NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_workflow_template_initial_step_belongs ON workflow_template;

---split---
CREATE TRIGGER trg_check_workflow_template_initial_step_belongs
BEFORE INSERT OR UPDATE OF initial_step_id
ON workflow_template
FOR EACH ROW EXECUTE FUNCTION check_workflow_template_initial_step_belongs();
