-- 005_register_managed_entity.sql
--
-- Auto register organizations and venues as managed entities.

-- organizations
CREATE OR REPLACE FUNCTION register_organization_as_managed_entity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO managed_entity (managed_entity_type, ref_id)
    VALUES ('organization', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_register_organization ON organization;

---split---
CREATE TRIGGER trg_register_organization
AFTER INSERT ON organization
FOR EACH ROW EXECUTE FUNCTION register_organization_as_managed_entity();

---split---
-- venues
CREATE OR REPLACE FUNCTION register_venue_as_managed_entity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO managed_entity (managed_entity_type, ref_id)
    VALUES ('venue', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_register_venue ON venue;

---split---
CREATE TRIGGER trg_register_venue
AFTER INSERT ON venue
FOR EACH ROW EXECUTE FUNCTION register_venue_as_managed_entity();

---split---
-- facilities
CREATE OR REPLACE FUNCTION register_facility_as_managed_entity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO managed_entity (managed_entity_type, ref_id)
    VALUES ('facility', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_register_facility ON facility;

---split---
CREATE TRIGGER trg_register_facility
AFTER INSERT ON facility
FOR EACH ROW EXECUTE FUNCTION register_facility_as_managed_entity();
