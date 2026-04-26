CREATE TABLE IF NOT EXISTS packages_core (
    package_id VARCHAR(36) NOT NULL,
    package_name VARCHAR(100),
    package_version VARCHAR(20),
    package_license VARCHAR(50),
    PRIMARY KEY (package_id)
) ENGINE=InnoDB;
