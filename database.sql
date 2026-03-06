CREATE TABLE celebrities (
    celebrityId PRIMARY KEY,
    name VARCHAR(100),
    profession VARCHAR(100),
    nationality VARCHAR(100),
)        

CREATE TABLE planeModels (
    planeId PRIMARY KEY,
    manufacturer VARCHAR(100),
    modelName VARCHAR(100),
    manufacturingYear INTEGER,
    capacity INTEGER,
    maxRangeKm INTEGER,
)

CREATE TABLE flights (
    flightID PRIMARY KEY,
    celebrityId REFERENCES celebrities(celebrityId),
    planeId REFERENCES planeModels(planeId),
    flightNumber VARCHAR(20),
    departureAirport VARCHAR(50),
    arrivalAirport VARCHAR(50),
    departureTime TIMESTAMP,
    arrivalTime TIMESTAMP
)