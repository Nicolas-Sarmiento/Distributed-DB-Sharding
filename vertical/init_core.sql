CREATE TABLE IF NOT EXISTS packages_core (
    package_id UUID PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL,
    package_version VARCHAR(20),
    package_license VARCHAR(50)
);
