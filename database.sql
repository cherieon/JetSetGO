CREATE TABLE celebrities (
    celebrityId SERIAL PRIMARY KEY,
    name VARCHAR(100),
    profession VARCHAR(100),
    nationality VARCHAR(100)
);      

CREATE TABLE planeModels (
    planeId SERIAL PRIMARY KEY,
    manufacturer VARCHAR(100),
    modelName VARCHAR(100),
    manufacturingYear INTEGER,
    capacity INTEGER,
    maxRangeKm INTEGER
);

CREATE TABLE flights (
    flightID SERIAL PRIMARY KEY,
    celebrityId INTEGER REFERENCES celebrities(celebrityId),
    planeId INTEGER REFERENCES planeModels(planeId),
    flightNumber VARCHAR(20),
    departureAirport VARCHAR(50),
    arrivalAirport VARCHAR(50),
    departureTime TIMESTAMP,
    arrivalTime TIMESTAMP
);

INSERT INTO celebrities (name, profession, nationality)
VALUES
    ('Leonardo DiCaprio', 'Actor', 'American'),
    ('Taylor Swift', 'Singer', 'American'),
    ('Elon Musk', 'Entrepreneur', 'South African');

INSERT INTO planeModels (manufacturer, modelName, manufacturingYear, capacity, maxRangeKm)
VALUES
    ('Airbus', 'A380', 2005, 853, 15200),
    ('Gulfstream', 'G650', 2012, 18, 12964),
    ('Bombardier', 'Global 7500', 2018, 19, 14100),
    ('Cessna', 'Citation X', 1996, 12, 6100),
    ('Gulfstream', '800', 2014, 19, 12964);

INSERT INTO flights (celebrityId, planeId, flightNumber, departureAirport, arrivalAirport, departureTime, arrivalTime)
VALUES
    (1,1,'AA100','JFK','LAX','2024-07-01 08:00:00','2024-07-01 11:00:00'),
    (2,2,'DL200','LAX','ORD','2024-07-02 09:00:00','2024-07-02 12:00:00'),
    (3,3,'UA300','ORD','MIA','2024-07-03 10:00:00','2024-07-03 14:00:00'),
    (1,4,'SW400','MIA','JFK','2024-07-04 11:00:00','2024-07-04 14:00:00'),
    (2,5,'AA500','JFK','LAX','2024-07-05 12:00:00','2024-07-05 15:00:00');


