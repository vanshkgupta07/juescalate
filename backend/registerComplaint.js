const supabase = require('./supabaseClient');
const localDb = require('./localDb');

async function registerComplaint(complaint) {
  try {
    console.log('Debug: Incoming complaint payload:', complaint);

    // Normalize field names - handle both camelCase and snake_case
    const normalizedComplaint = {
      title: complaint.title,
      description: complaint.description,
      student_id: complaint.student_id || complaint.studentId,
      authority_id: complaint.authority_id || complaint.authorityId,
      student_name: complaint.student_name || complaint.studentName,
      authority_name: complaint.authority_name || complaint.authorityName,
      status: complaint.status || 'pending',
      category: complaint.category,
      priority: complaint.priority,
    };

    // Validate required fields
    const requiredFields = ['title', 'description', 'student_id', 'authority_id', 'student_name', 'authority_name'];
    const missingFields = requiredFields.filter(field => !normalizedComplaint[field]);

    if (missingFields.length > 0) {
      console.log('Debug: Normalized complaint data:', normalizedComplaint);
      console.error('Missing required complaint fields:', missingFields);
      return { status: 400, data: { error: `Missing required complaint fields: ${missingFields.join(', ')}` } };
    }

    // Transform the complaint data to match database schema
    const transformedComplaint = {
      ...normalizedComplaint,
      current_authority_id: normalizedComplaint.authority_id,
      current_authority_level: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Debug: Transformed complaint data:', transformedComplaint);

    const { data, error } = await supabase
      .from('complaints')
      .insert([transformedComplaint])
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      return localDb.registerComplaint(transformedComplaint);
    }

    console.log('Successfully inserted complaint:', data);
    return { status: 201, data };
  } catch (error) {
    console.error('Server error in registerComplaint:', error);
    return localDb.registerComplaint({
      title: complaint.title,
      description: complaint.description,
      student_id: complaint.student_id || complaint.studentId,
      authority_id: complaint.authority_id || complaint.authorityId,
      student_name: complaint.student_name || complaint.studentName,
      authority_name: complaint.authority_name || complaint.authorityName,
      status: complaint.status || 'pending',
      category: complaint.category,
      priority: complaint.priority,
    });
  }
}

module.exports = { registerComplaint };
