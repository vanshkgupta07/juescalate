const supabase = require('./supabaseClient');

async function updateComplaintStatus(complaintId, status) {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .update({ status })
      .eq('id', complaintId)
      .select();
    if (error) {
      return { status: 400, data: { error: error.message } };
    }
    return { status: 200, data };
  } catch (error) {
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

module.exports = { updateComplaintStatus };
