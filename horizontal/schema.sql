CREATE TABLE IF NOT EXISTS software_packages (
    packageId VARCHAR(36) NOT NULL,
    packageName VARCHAR (100),
    packageVersion VARCHAR(20),
    packageLicense VARCHAR(50),
    PRIMARY KEY (packageId)
) ENGINE=InnoDB;