
CREATE TABLE planeModels (
    planeId SERIAL PRIMARY KEY,
    manufacturer VARCHAR(100),
    modelName VARCHAR(100),
    manufacturingYear INTEGER,
    capacity INTEGER,
    maxRangeKm INTEGER
);

CREATE TABLE celebrities (
    celebrityId SERIAL PRIMARY KEY,
    name VARCHAR(100),
    profession VARCHAR(100),
    nationality VARCHAR(100)
);      

CREATE TABLE airports (
    airportCode VARCHAR(5) PRIMARY KEY,
    name VARCHAR(100),
    city VARCHAR(50),
    country VARCHAR(50)
);


CREATE TABLE flights (
    flightID SERIAL PRIMARY KEY,
    celebrityId INTEGER REFERENCES celebrities(celebrityId),
    planeId INTEGER REFERENCES planeModels(planeId),
    flightNumber VARCHAR(20),
    departureAirport VARCHAR(5) REFERENCES airports(airportCode),
 	arrivalAirport VARCHAR(5) REFERENCES airports(airportCode),
    departureTime TIMESTAMP,
    arrivalTime TIMESTAMP
);

INSERT INTO celebrities (name, profession, nationality)
VALUES
    ('Leonardo DiCaprio', 'Actor', 'American'),
    ('Taylor Swift', 'Singer', 'American'),
    ('Elon Musk', 'Entrepreneur', 'South African'),
    ('Jay-Z',            'Rapper / Entrepreneur',  'American'),
    ('Kylie Jenner',     'Entrepreneur / Model',   'American'),
    ('Kim Kardashian',   'Entrepreneur / TV Star',  'American'),
    ('Drake',            'Rapper / Singer',         'Canadian'),
    ('Jeff Bezos',       'Entrepreneur',            'American'),
    ('Beyoncé',          'Singer',                  'American'),
    ('Rihanna',          'Singer / Entrepreneur',   'American'),
    ('Justin Bieber',    'Singer',                  'Canadian'),
    ('Cristiano Ronaldo','Footballer',              'Portuguese'),
    ('Oprah Winfrey',    'TV Host / Entrepreneur',  'American');

INSERT INTO planeModels (manufacturer, modelName, manufacturingYear, capacity, maxRangeKm)
VALUES
    ('Airbus', 'A380', 2005, 853, 15200),
    ('Gulfstream', 'G650', 2012, 18, 12964),
    ('Bombardier', 'Global 7500', 2018, 19, 14100),
    ('Cessna', 'Citation X', 1996, 12, 6100),
    ('Gulfstream', '800', 2014, 19, 12964),
    ('Boeing',      '737-700',        2003, 128, 6370),
    ('Gulfstream',  'G550',           2004, 16,  12501),
    ('Dassault',    'Falcon 7X',2007, 14,  11020),
    ('Embraer',     'Phenom 300',     2010, 10,  3650),
    ('Boeing','767-200',  1999, 224, 12200);


	
INSERT INTO airports (airportCode, name, city, country)
VALUES
('JFK','John F. Kennedy International','New York','USA'),
('LAX','Los Angeles International','Los Angeles','USA'),
('ORD','O''Hare International','Chicago','USA'),
('MIA','Miami International','Miami','USA'),
('LHR','Heathrow Airport','London','UK'),
('CDG','Charles de Gaulle Airport','Paris','France'),
('DXB','Dubai International Airport','Dubai','UAE'),
('SYD','Sydney Kingsford Smith Airport','Sydney','Australia'),
('NRT','Narita International Airport','Tokyo','Japan'),
('LAS','Harry Reid International Airport','Las Vegas','USA'),
('ORY','Paris Orly Airport','Paris','France'),
('VNY','Van Nuys Airport','Los Angeles','USA'),
('TEB','Teterboro Airport','New York','USA'),
('SMF','Sacramento International Airport','Sacramento','USA'),
('SJC','San Jose International Airport','San Jose','USA'),
('BOS','Logan International Airport','Boston','USA'),
('MAN','Manchester Airport','Manchester','UK'),
('FCO','Leonardo da Vinci International','Rome','Italy'),
('BCN','Barcelona El Prat Airport','Barcelona','Spain'),
('SXM','Princess Juliana International','Sint Maarten','Caribbean'),
('KVNY','Van Nuys Airport (private)','Los Angeles','USA')
ON CONFLICT (airportCode) DO NOTHING;


    INSERT INTO flights (flightId, celebrityId, planeId, flightNumber, departureAirport, arrivalAirport, departureTime, arrivalTime)
    VALUES
        (17, 6, 3, 'KK003', 'DXB', 'TEB', '2025-01-23 23:00:00', '2025-01-24 06:00:00'),
        (18, 6, 4, 'KK004', 'LAX', 'SJC', '2025-02-01 09:00:00', '2025-02-01 09:50:00'),
        (19, 7, 10, 'DR001', 'TEB', 'MIA', '2025-01-20 10:00:00', '2025-01-20 13:00:00'),
        (20, 7, 10, 'DR002', 'MIA', 'LAX', '2025-01-25 14:00:00', '2025-01-25 17:00:00'),
        (21, 7, 10, 'DR003', 'LAX', 'NRT', '2025-02-10 01:00:00', '2025-02-10 19:00:00'),
        (22, 7, 10, 'DR004', 'NRT', 'SYD', '2025-02-14 09:00:00', '2025-02-14 20:00:00'),
        (23, 7, 10, 'DR005', 'SYD', 'TEB', '2025-02-20 11:00:00', '2025-02-21 06:00:00'),
        (24, 8, 3, 'JB001', 'TEB', 'LAX', '2025-01-05 07:00:00', '2025-01-05 10:00:00'),
        (25, 8, 3, 'JB002', 'LAX', 'SMF', '2025-01-10 11:00:00', '2025-01-10 11:55:00'),
        (26, 8, 8, 'JB003', 'SMF', 'LHR', '2025-02-01 16:00:00', '2025-02-02 09:00:00'),
        (27, 8, 8, 'JB004', 'LHR', 'FCO', '2025-02-05 09:00:00', '2025-02-05 12:00:00'),
        (28, 8, 8, 'JB005', 'FCO', 'TEB', '2025-02-09 14:00:00', '2025-02-09 19:00:00'),
        (29, 9, 3, 'BY001', 'LAX', 'JFK', '2025-03-01 08:00:00', '2025-03-01 16:00:00'),
        (30, 9, 3, 'BY002', 'JFK', 'LHR', '2025-03-10 21:00:00', '2025-03-11 09:00:00'),
        (31, 9, 3, 'BY003', 'LHR', 'CDG', '2025-03-14 12:00:00', '2025-03-14 13:15:00'),
        (32, 9, 3, 'BY004', 'CDG', 'ORY', '2025-03-17 14:00:00', '2025-03-17 15:00:00'),
        (33, 9, 3, 'BY005', 'ORY', 'LAX', '2025-03-20 10:00:00', '2025-03-20 19:30:00'),
        (34, 10, 2, 'RH001', 'LAX', 'SXM', '2025-01-10 08:00:00', '2025-01-10 16:00:00'),
        (35, 10, 2, 'RH002', 'SXM', 'LHR', '2025-01-18 19:00:00', '2025-01-19 09:00:00'),
        (36, 10, 2, 'RH003', 'LHR', 'MAN', '2025-01-22 10:00:00', '2025-01-22 11:10:00'),
        (37, 10, 2, 'RH004', 'MAN', 'JFK', '2025-01-25 13:00:00', '2025-01-25 17:30:00'),
        (38, 11, 4, 'JBB001', 'TEB', 'ORD', '2025-02-05 09:00:00', '2025-02-05 10:30:00'),
        (39, 11, 4, 'JBB002', 'ORD', 'LAX', '2025-02-07 12:00:00', '2025-02-07 14:30:00'),
        (40, 11, 9, 'JBB003', 'LAX', 'NRT', '2025-02-12 00:00:00', '2025-02-12 18:00:00'),
        (41, 11, 9, 'JBB004', 'NRT', 'SYD', '2025-02-16 10:00:00', '2025-02-16 21:00:00'),
        (42, 11, 4, 'JBB005', 'SYD', 'LAX', '2025-02-20 14:00:00', '2025-02-21 08:00:00'),
        (43, 12, 8, 'CR001', 'FCO', 'DXB', '2025-01-12 10:00:00', '2025-01-12 17:00:00'),
        (44, 12, 8, 'CR002', 'DXB', 'LHR', '2025-01-20 08:00:00', '2025-01-20 12:30:00'),
        (45, 12, 8, 'CR003', 'LHR', 'BCN', '2025-02-02 14:00:00', '2025-02-02 16:30:00'),
        (46, 12, 8, 'CR004', 'BCN', 'FCO', '2025-02-10 11:00:00', '2025-02-10 12:30:00'),
        (47, 12, 8, 'CR005', 'FCO', 'NRT', '2025-03-01 22:00:00', '2025-03-02 17:00:00'),
        (48, 13, 3, 'OW001', 'SMF', 'ORD', '2025-01-08 07:00:00', '2025-01-08 10:00:00'),
        (49, 13, 3, 'OW002', 'ORD', 'LHR', '2025-01-15 18:00:00', '2025-01-16 07:00:00'),
        (50, 13, 3, 'OW003', 'LHR', 'SYD', '2025-01-20 12:00:00', '2025-01-21 10:00:00'),
        (51, 13, 3, 'OW004', 'SYD', 'NRT', '2025-01-28 08:00:00', '2025-01-28 15:00:00'),
        (52, 13, 3, 'OW005', 'NRT', 'BOS', '2025-02-03 11:00:00', '2025-02-03 09:00:00'),
        (53, 13, 3, 'OW006', 'BOS', 'SMF', '2025-02-06 13:00:00', '2025-02-06 18:00:00')
ON CONFLICT (flightID) DO NOTHING;


