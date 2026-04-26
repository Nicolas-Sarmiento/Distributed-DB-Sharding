CREATE TABLE IF NOT EXISTS packages_details (
    package_id VARCHAR(36) NOT NULL,
    author VARCHAR(100),
    description TEXT,
    repository_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (package_id)
) ENGINE=InnoDB;
