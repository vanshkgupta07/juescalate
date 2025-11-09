const supabase = require('./supabaseClient');

async function registerComplaint(complaint) {
  try {
    console.log('Received complaint data:', complaint);

    // Transform the complaint data to match database schema (snake_case)
    const transformedComplaint = {
      title: complaint.title,
      description: complaint.description,
      student_id: complaint.studentId,
      authority_id: complaint.authority_id, // Changed from authorityId to authority_id
      status: complaint.status || 'pending',
      category: complaint.category,
      priority: complaint.priority,
      student_name: complaint.studentName,
      authority_name: complaint.authorityName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Transformed complaint data for database:', transformedComplaint);

    const { data, error } = await supabase
      .from('complaints')
      .insert([transformedComplaint])
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      return { status: 400, data: { error: error.message } };
    }

    console.log('Successfully inserted complaint:', data);
    return { status: 201, data };
  } catch (error) {
    console.error('Server error in registerComplaint:', error);
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

module.exports = { registerComplaint };