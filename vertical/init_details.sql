CREATE TABLE IF NOT EXISTS packages_details (
    package_id UUID PRIMARY KEY,
    author VARCHAR(100),
    description TEXT,
    repository_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
