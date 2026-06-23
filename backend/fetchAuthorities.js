const supabase = require('./supabaseClient');
const localDb = require('./localDb');

async function fetchAuthorities(req, res) {
  try {
    console.log('Fetching authorities...');
    
    // For debugging, you can enable more verbose logging
    console.log("Query description: SELECT id, email, name, role, department FROM user_profiles WHERE role = 'authority'");
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const result = await supabase
      .from('user_profiles')
      .select('id, email, name, role, department')
      .eq('role', 'authority');

    // Log the raw Supabase response for debugging
    console.log('Raw Supabase response:', result);

    const authorities = result.data;
    const error = result.error;
    console.log('Raw supabase response keys:', Object.keys(result || {}));
    console.log('Raw supabase response:', {
      dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
      dataLength: Array.isArray(result.data) ? result.data.length : undefined,
      error: result.error ? { message: result.error.message, details: result.error.details } : null
    });

    if (error) {
      console.error('Error fetching authorities:', error);
      return res.status(200).json(localDb.listAuthorities());
    }

    console.log(`Authorities found: ${authorities?.length || 0}`);
    // Log a small sample of the returned data for easier debugging
    console.log('Authorities sample:', JSON.stringify(authorities?.slice(0, 5) || []));
    
    return res.status(200).json(authorities || []);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(200).json(localDb.listAuthorities());
  }
}

module.exports = fetchAuthorities;
