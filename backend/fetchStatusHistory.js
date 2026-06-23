const supabase = require('./supabaseClient');
const localDb = require('./localDb');

async function fetchStatusHistory(complaintId) {
  try {
    console.log('Fetching status history for complaint:', complaintId);

    // Fetch the initial complaint details for the first status
    const { data: complaints, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        created_at,
        student_name,
        authority_name,
        status
      `)
      .eq('id', complaintId);

    if (complaintError) {
      console.error('Error fetching complaint:', complaintError);
      if (complaintError.message === 'fetch failed' || complaintError.message?.includes('fetch')) {
        console.log('Falling back to local auth store for status history');
        return localDb.getStatusHistory(complaintId);
      }
      return { status: 400, data: { error: complaintError.message } };
    }

    if (!complaints || complaints.length === 0) {
      console.error('No complaint found with ID:', complaintId);
      return { status: 404, data: { error: 'Complaint not found' } };
    }

    const complaint = complaints[0];

    // Fetch all status updates
    const { data: statusUpdates, error: statusError } = await supabase
      .from('status_updates')
      .select(`
        id,
        status,
        remarks,
        created_at,
        updated_by,
        user_profiles (
          name,
          role,
          department,
          authority_level
        )
      `)
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: true });

    if (statusError) {
      console.error('Error fetching status updates:', statusError);
      if (statusError.message === 'fetch failed' || statusError.message?.includes('fetch')) {
        console.log('Falling back to local auth store for status history (statusError)');
        return localDb.getStatusHistory(complaintId);
      }
      return { status: 400, data: { error: statusError.message } };
    }

    // Create a timeline combining initial status and all updates
    const timeline = [
      {
        id: 'initial',
        status: 'pending',
        remarks: 'Complaint submitted',
        created_at: complaint.created_at,
        user_profiles: {
          name: complaint.student_name,
          role: 'student'
        }
      },
      ...statusUpdates
    ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    console.log('Successfully fetched status timeline:', timeline);
    return { status: 200, data: timeline };
  } catch (error) {
    console.error('Internal server error:', error);
    console.log('Falling back to local auth store for status history due to catch');
    return localDb.getStatusHistory(complaintId);
  }
}

module.exports = { fetchStatusHistory };