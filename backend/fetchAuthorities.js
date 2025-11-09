const supabase = require('./supabaseClient');

async function fetchAuthorities(req, res) {
  try {
    console.log('Fetching authorities...');
    
    // For debugging, you can enable more verbose logging
    console.log('Query description: SELECT id, name, department, role FROM user_profiles WHERE role = "authority"');

    const { data: authorities, error } = await supabase
      .from('user_profiles')
      .select('id, name, department, role')
      .eq('role', 'authority');

    if (error) {
      console.error('Error fetching authorities:', error);
      return res.status(500).json({ error: 'Failed to fetch authorities: ' + error.message });
    }

    console.log(`Authorities found: ${authorities?.length || 0}`);
    
    return res.status(200).json(authorities || []);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = fetchAuthorities;