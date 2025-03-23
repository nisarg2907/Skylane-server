import { PrismaClient } from '@prisma/client';
import { addDays, addHours } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  // Clear existing data (optional - for dev environments)
  console.log('Cleaning existing data...');
  await prisma.flightSegment.deleteMany({});
  await prisma.passenger.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.flight.deleteMany({});
  await prisma.airline.deleteMany({});
  await prisma.airport.deleteMany({});
  await prisma.paymentMethod.deleteMany({});
  await prisma.user.deleteMany({});
  // Seed airports (50 major airports worldwide)
  console.log('Seeding airports...');
  const airports = [
    {
      code: 'ATL',
      name: 'Hartsfield-Jackson Atlanta International Airport',
      city: 'Atlanta',
      country: 'USA',
      latitude: 33.6407,
      longitude: -84.4277,
    },
    {
      code: 'PEK',
      name: 'Beijing Capital International Airport',
      city: 'Beijing',
      country: 'China',
      latitude: 40.0799,
      longitude: 116.6031,
    },
    {
      code: 'LHR',
      name: 'London Heathrow Airport',
      city: 'London',
      country: 'United Kingdom',
      latitude: 51.47,
      longitude: -0.4543,
    },
    {
      code: 'HND',
      name: 'Tokyo Haneda Airport',
      city: 'Tokyo',
      country: 'Japan',
      latitude: 35.5494,
      longitude: 139.7798,
    },
    {
      code: 'LAX',
      name: 'Los Angeles International Airport',
      city: 'Los Angeles',
      country: 'USA',
      latitude: 33.9416,
      longitude: -118.4085,
    },
    {
      code: 'CDG',
      name: 'Paris Charles de Gaulle Airport',
      city: 'Paris',
      country: 'France',
      latitude: 49.0097,
      longitude: 2.5479,
    },
    {
      code: 'DXB',
      name: 'Dubai International Airport',
      city: 'Dubai',
      country: 'UAE',
      latitude: 25.2528,
      longitude: 55.3644,
    },
    {
      code: 'FRA',
      name: 'Frankfurt Airport',
      city: 'Frankfurt',
      country: 'Germany',
      latitude: 50.0379,
      longitude: 8.5622,
    },
    {
      code: 'HKG',
      name: 'Hong Kong International Airport',
      city: 'Hong Kong',
      country: 'China',
      latitude: 22.308,
      longitude: 113.9185,
    },
    {
      code: 'DFW',
      name: 'Dallas/Fort Worth International Airport',
      city: 'Dallas',
      country: 'USA',
      latitude: 32.8998,
      longitude: -97.0403,
    },
    {
      code: 'CGK',
      name: 'Soekarno-Hatta International Airport',
      city: 'Jakarta',
      country: 'Indonesia',
      latitude: -6.1256,
      longitude: 106.6558,
    },
    {
      code: 'AMS',
      name: 'Amsterdam Airport Schiphol',
      city: 'Amsterdam',
      country: 'Netherlands',
      latitude: 52.3105,
      longitude: 4.7683,
    },
    {
      code: 'SIN',
      name: 'Singapore Changi Airport',
      city: 'Singapore',
      country: 'Singapore',
      latitude: 1.3644,
      longitude: 103.9915,
    },
    {
      code: 'CAN',
      name: 'Guangzhou Baiyun International Airport',
      city: 'Guangzhou',
      country: 'China',
      latitude: 23.3959,
      longitude: 113.308,
    },
    {
      code: 'JFK',
      name: 'John F. Kennedy International Airport',
      city: 'New York',
      country: 'USA',
      latitude: 40.6413,
      longitude: -73.7781,
    },
    {
      code: 'DEL',
      name: 'Indira Gandhi International Airport',
      city: 'New Delhi',
      country: 'India',
      latitude: 28.5562,
      longitude: 77.1,
    },
    {
      code: 'ICN',
      name: 'Incheon International Airport',
      city: 'Seoul',
      country: 'South Korea',
      latitude: 37.4602,
      longitude: 126.4407,
    },
    {
      code: 'IST',
      name: 'Istanbul Airport',
      city: 'Istanbul',
      country: 'Turkey',
      latitude: 41.2608,
      longitude: 28.7418,
    },
    {
      code: 'SYD',
      name: 'Sydney Kingsford Smith Airport',
      city: 'Sydney',
      country: 'Australia',
      latitude: -33.9399,
      longitude: 151.1753,
    },
    {
      code: 'MEX',
      name: 'Mexico City International Airport',
      city: 'Mexico City',
      country: 'Mexico',
      latitude: 19.4361,
      longitude: -99.0719,
    },
    {
      code: 'MUC',
      name: 'Munich Airport',
      city: 'Munich',
      country: 'Germany',
      latitude: 48.3537,
      longitude: 11.786,
    },
    {
      code: 'YYZ',
      name: 'Toronto Pearson International Airport',
      city: 'Toronto',
      country: 'Canada',
      latitude: 43.6777,
      longitude: -79.6248,
    },
    {
      code: 'BOM',
      name: 'Chhatrapati Shivaji International Airport',
      city: 'Mumbai',
      country: 'India',
      latitude: 19.0896,
      longitude: 72.8656,
    },
    {
      code: 'MAD',
      name: 'Adolfo Suárez Madrid–Barajas Airport',
      city: 'Madrid',
      country: 'Spain',
      latitude: 40.4983,
      longitude: -3.5676,
    },
    {
      code: 'BCN',
      name: 'Barcelona-El Prat Airport',
      city: 'Barcelona',
      country: 'Spain',
      latitude: 41.2971,
      longitude: 2.0785,
    },
    {
      code: 'LGW',
      name: 'London Gatwick Airport',
      city: 'London',
      country: 'United Kingdom',
      latitude: 51.1537,
      longitude: -0.1821,
    },
    {
      code: 'SEA',
      name: 'Seattle-Tacoma International Airport',
      city: 'Seattle',
      country: 'USA',
      latitude: 47.4502,
      longitude: -122.3088,
    },
    {
      code: 'BKK',
      name: 'Suvarnabhumi Airport',
      city: 'Bangkok',
      country: 'Thailand',
      latitude: 13.69,
      longitude: 100.7501,
    },
    {
      code: 'SFO',
      name: 'San Francisco International Airport',
      city: 'San Francisco',
      country: 'USA',
      latitude: 37.6213,
      longitude: -122.379,
    },
    {
      code: 'ORD',
      name: "O'Hare International Airport",
      city: 'Chicago',
      country: 'USA',
      latitude: 41.9742,
      longitude: -87.9073,
    },
    {
      code: 'KUL',
      name: 'Kuala Lumpur International Airport',
      city: 'Kuala Lumpur',
      country: 'Malaysia',
      latitude: 2.7456,
      longitude: 101.7099,
    },
    {
      code: 'VIE',
      name: 'Vienna International Airport',
      city: 'Vienna',
      country: 'Austria',
      latitude: 48.1102,
      longitude: 16.5697,
    },
    {
      code: 'ZRH',
      name: 'Zurich Airport',
      city: 'Zurich',
      country: 'Switzerland',
      latitude: 47.4582,
      longitude: 8.5555,
    },
    {
      code: 'DUB',
      name: 'Dublin Airport',
      city: 'Dublin',
      country: 'Ireland',
      latitude: 53.4264,
      longitude: -6.2499,
    },
    {
      code: 'CPH',
      name: 'Copenhagen Airport',
      city: 'Copenhagen',
      country: 'Denmark',
      latitude: 55.618,
      longitude: 12.656,
    },
    {
      code: 'DOH',
      name: 'Hamad International Airport',
      city: 'Doha',
      country: 'Qatar',
      latitude: 25.273,
      longitude: 51.6083,
    },
    {
      code: 'HEL',
      name: 'Helsinki Airport',
      city: 'Helsinki',
      country: 'Finland',
      latitude: 60.3183,
      longitude: 24.9497,
    },
    {
      code: 'LIS',
      name: 'Lisbon Airport',
      city: 'Lisbon',
      country: 'Portugal',
      latitude: 38.7742,
      longitude: -9.1342,
    },
    {
      code: 'OSL',
      name: 'Oslo Airport',
      city: 'Oslo',
      country: 'Norway',
      latitude: 60.1976,
      longitude: 11.1004,
    },
    {
      code: 'AKL',
      name: 'Auckland Airport',
      city: 'Auckland',
      country: 'New Zealand',
      latitude: -37.0082,
      longitude: 174.785,
    },
    {
      code: 'ARN',
      name: 'Stockholm Arlanda Airport',
      city: 'Stockholm',
      country: 'Sweden',
      latitude: 59.6498,
      longitude: 17.9238,
    },
    {
      code: 'MNL',
      name: 'Ninoy Aquino International Airport',
      city: 'Manila',
      country: 'Philippines',
      latitude: 14.5086,
      longitude: 121.0195,
    },
    {
      code: 'NRT',
      name: 'Narita International Airport',
      city: 'Tokyo',
      country: 'Japan',
      latitude: 35.7719,
      longitude: 140.3928,
    },
    {
      code: 'GRU',
      name: 'São Paulo–Guarulhos International Airport',
      city: 'São Paulo',
      country: 'Brazil',
      latitude: -23.4356,
      longitude: -46.4731,
    },
    {
      code: 'BWI',
      name: 'Baltimore/Washington International Airport',
      city: 'Baltimore',
      country: 'USA',
      latitude: 39.1774,
      longitude: -76.6684,
    },
    {
      code: 'DEN',
      name: 'Denver International Airport',
      city: 'Denver',
      country: 'USA',
      latitude: 39.8561,
      longitude: -104.6737,
    },
    {
      code: 'MIA',
      name: 'Miami International Airport',
      city: 'Miami',
      country: 'USA',
      latitude: 25.7952,
      longitude: -80.2714,
    },
    {
      code: 'BOS',
      name: 'Boston Logan International Airport',
      city: 'Boston',
      country: 'USA',
      latitude: 42.3656,
      longitude: -71.0096,
    },
    {
      code: 'CAI',
      name: 'Cairo International Airport',
      city: 'Cairo',
      country: 'Egypt',
      latitude: 30.1219,
      longitude: 31.4056,
    },
  ];

  // Validate airport code uniqueness
  const airportCodes = new Set();
  for (const airport of airports) {
    if (airportCodes.has(airport.code)) {
      console.error(`Duplicate airport code found: ${airport.code}`);
      throw new Error(`Duplicate airport code: ${airport.code}`);
    }
    airportCodes.add(airport.code);
  }

  for (const airport of airports) {
    await prisma.airport.create({
      data: airport,
    });
  }

  // Seed airlines (50 major airlines)
  console.log('Seeding airlines...');
  const airlines = [
    { code: 'DL', name: 'Delta Air Lines' },
    { code: 'AA', name: 'American Airlines' },
    { code: 'UA', name: 'United Airlines' },
    { code: 'LH', name: 'Lufthansa' },
    { code: 'BA', name: 'British Airways' },
    { code: 'AF', name: 'Air France' },
    { code: 'EK', name: 'Emirates' },
    { code: 'QR', name: 'Qatar Airways' },
    { code: 'SQ', name: 'Singapore Airlines' },
    { code: 'CX', name: 'Cathay Pacific' },
    { code: 'TK', name: 'Turkish Airlines' },
    { code: 'KL', name: 'KLM Royal Dutch Airlines' },
    { code: 'NH', name: 'All Nippon Airways' },
    { code: 'JL', name: 'Japan Airlines' },
    { code: 'EY', name: 'Etihad Airways' },
    { code: 'AC', name: 'Air Canada' },
    { code: 'QF', name: 'Qantas' },
    { code: 'CA', name: 'Air China' },
    { code: 'MU', name: 'China Eastern Airlines' },
    { code: 'CZ', name: 'China Southern Airlines' },
    { code: 'LX', name: 'Swiss International Air Lines' },
    { code: 'OS', name: 'Austrian Airlines' },
    { code: 'SK', name: 'SAS Scandinavian Airlines' },
    { code: 'BR', name: 'EVA Air' },
    { code: 'CI', name: 'China Airlines' },
    { code: 'OZ', name: 'Asiana Airlines' },
    { code: 'KE', name: 'Korean Air' },
    { code: 'TG', name: 'Thai Airways' },
    { code: 'AY', name: 'Finnair' },
    { code: 'IB', name: 'Iberia' },
    { code: 'LA', name: 'LATAM Airlines' },
    { code: 'VS', name: 'Virgin Atlantic' },
    { code: 'EI', name: 'Aer Lingus' },
    { code: 'WN', name: 'Southwest Airlines' },
    { code: 'B6', name: 'JetBlue Airways' },
    { code: 'AS', name: 'Alaska Airlines' },
    { code: 'EW', name: 'Eurowings' },
    { code: 'FR', name: 'Ryanair' },
    { code: 'U2', name: 'easyJet' },
    { code: 'WS', name: 'WestJet' },
    { code: 'VN', name: 'Vietnam Airlines' },
    { code: 'AH', name: 'Ahmedbaabd Airport' },
    { code: 'MH', name: 'Malaysia Airlines' },
    { code: 'SV', name: 'Saudia' },
    { code: 'ET', name: 'Ethiopian Airlines' },
    { code: 'SA', name: 'South African Airways' },
    { code: 'MS', name: 'EgyptAir' },
    { code: 'LY', name: 'El Al Israel Airlines' },
    { code: 'AZ', name: 'Alitalia' },
    { code: 'TP', name: 'TAP Air Portugal' },
  ];

  // Validate airline code uniqueness
  const airlineCodes = new Set();
  for (const airline of airlines) {
    if (airlineCodes.has(airline.code)) {
      console.error(`Duplicate airline code found: ${airline.code}`);
      throw new Error(`Duplicate airline code: ${airline.code}`);
    }
    airlineCodes.add(airline.code);
  }

  for (const airline of airlines) {
    await prisma.airline.create({
      data: airline,
    });
  }

  // Get the IDs of created airports and airlines for referencing in flights
  const airportEntities = await prisma.airport.findMany();
  const airlineEntities = await prisma.airline.findMany();

  // Seed flights (50 flights with varying schedules and routes)
  console.log('Seeding flights...');

  const today = new Date();
  const flights = [];

  // Create random flights between airports
  for (let i = 0; i < 50; i++) {
    // Randomly select departure and arrival airports (ensuring they're different)
    const departureAirportIndex = Math.floor(
      Math.random() * airportEntities.length,
    );
    let arrivalAirportIndex;
    do {
      arrivalAirportIndex = Math.floor(Math.random() * airportEntities.length);
    } while (departureAirportIndex === arrivalAirportIndex);

    const departureAirport = airportEntities[departureAirportIndex];
    const arrivalAirport = airportEntities[arrivalAirportIndex];

    // Randomly select an airline
    const airline =
      airlineEntities[Math.floor(Math.random() * airlineEntities.length)];

    // Generate a random flight number
    const flightNumber = `${airline.code}${100 + Math.floor(Math.random() * 900)}`;

    // Generate random departure time in the next 30 days
    const departureDate = addDays(today, Math.floor(Math.random() * 30));
    departureDate.setHours(
      Math.floor(Math.random() * 24),
      Math.floor(Math.random() * 12) * 5, // rounded to 5-minute intervals
      0,
    );

    // Calculate flight duration based on distance (simplified)
    // For this example, we'll use a random duration between 1 to 15 hours
    const flightDurationHours = 1 + Math.floor(Math.random() * 15);
    const arrivalDate = addHours(departureDate, flightDurationHours);

    // Generate random prices
    const economyPrice = 100 + Math.floor(Math.random() * 900);
    const premiumEconomyPrice = economyPrice * 1.5;
    const businessPrice = economyPrice * 2.5;
    const firstClassPrice = economyPrice * 4;

    // Generate random capacities
    const economyCapacity = 100 + Math.floor(Math.random() * 150);
    const premiumEconomyCapacity = 20 + Math.floor(Math.random() * 30);
    const businessCapacity = 10 + Math.floor(Math.random() * 20);
    const firstClassCapacity = Math.floor(Math.random() * 10);

    flights.push({
      flightNumber,
      airlineId: airline.id,
      departureAirportId: departureAirport.id,
      arrivalAirportId: arrivalAirport.id,
      departureTime: departureDate,
      arrivalTime: arrivalDate,
      economyCapacity,
      premiumEconomyCapacity,
      businessCapacity,
      firstClassCapacity,
      economyPrice,
      premiumEconomyPrice,
      businessPrice,
      firstClassPrice,
      status: 'SCHEDULED',
    });
  }

  for (const flight of flights) {
    await prisma.flight.create({
      data: flight,
    });
  }

  // Create a test user with payment methods and bookings
  console.log('Creating test user with bookings...');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
