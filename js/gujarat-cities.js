// Gujarat Cities Database for Auto-suggestions
const GUJARAT_CITIES = [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar',
    'Anand', 'Navsari', 'Morbi', 'Nadiad', 'Surendranagar', 'Bharuch', 'Mehsana', 'Bhuj', 'Porbandar',
    'Palanpur', 'Valsad', 'Vapi', 'Gondal', 'Veraval', 'Godhra', 'Patan', 'Kalol', 'Dahod', 'Botad',
    'Amreli', 'Deesa', 'Jetpur', 'Palitana', 'Radhanpur', 'Mahuva', 'Modasa', 'Keshod', 'Wadhwan',
    'Ankleshwar', 'Savarkundla', 'Kadi', 'Visnagar', 'Upleta', 'Una', 'Sidhpur', 'Unjha', 'Mangrol',
    'Idar', 'Wankaner', 'Padra', 'Lunawada', 'Rajula', 'Morvi', 'Dwarka', 'Dhoraji', 'Khambhat',
    'Mahemdavad', 'Lagaan', 'Limbdi', 'Borsad', 'Salaya', 'Harij', 'Dhandhuka', 'Dholka', 'Kapadwanj',
    'Himmatnagar', 'Kheralu', 'Sanand', 'Petlad', 'Kapadvanj', 'Viramgam', 'Halol', 'Fatehpur',
    'Bilimora', 'Navsari', 'Chikhli', 'Vyara', 'Bardoli', 'Mandvi', 'Mundra', 'Anjar', 'Rapar'
];

// Function to get Gujarat city suggestions
function getGujaratCitySuggestions(query, limit = 8) {
    if (!query || query.length < 1) return [];
    
    const searchTerm = query.toLowerCase().trim();
    
    return GUJARAT_CITIES
        .filter(city => city.toLowerCase().includes(searchTerm))
        .slice(0, limit)
        .map(city => ({
            name: city,
            state: 'Gujarat',
            country: 'IN',
            displayName: `${city}, Gujarat`
        }));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GUJARAT_CITIES, getGujaratCitySuggestions };
}