-- 014_check_event_parent_cycle.sql
--
-- prevents circular parent references in the event hierarchy

CREATE OR REPLACE FUNCTION check_event_parent_cycle()
RETURNS TRIGGER AS $$
DECLARE
    v_current_id BIGINT := NEW.parent_event_id;
BEGIN
    IF NEW.parent_event_id IS NULL THEN
        RETURN NEW;
    END IF;

    WHILE v_current_id IS NOT NULL LOOP
        IF v_current_id = NEW.id THEN
            RAISE EXCEPTION
                'event: setting parent to % would create a cycle',
                NEW.parent_event_id;
        END IF;

        SELECT parent_event_id INTO v_current_id
        FROM event
        WHERE id = v_current_id
        AND deleted_at IS NULL;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_event_parent_cycle ON event;

---split---
CREATE TRIGGER trg_check_event_parent_cycle
BEFORE INSERT OR UPDATE OF parent_event_id
ON event
FOR EACH ROW EXECUTE FUNCTION check_event_parent_cycle();
