const supabase = require('./supabaseClient');

async function fetchStudentComplaints(studentId) {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('studentId', studentId);
    if (error) {
      return { status: 400, data: { error: error.message } };
    }
    return { status: 200, data };
  } catch (error) {
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

async function fetchAuthorityComplaints(authorityId) {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('authorityId', authorityId);
    if (error) {
      return { status: 400, data: { error: error.message } };
    }
    return { status: 200, data };
  } catch (error) {
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

module.exports = { fetchStudentComplaints, fetchAuthorityComplaints };
