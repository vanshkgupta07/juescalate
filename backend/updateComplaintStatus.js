const supabase = require('./supabaseClient');
const localDb = require('./localDb');

async function updateComplaintStatus(complaintId, status, remarks, updatedBy) {
  try {
    // Convert hyphen to underscore for status
    const normalizedStatus = status.replace(/-/g, '_');
    
    console.log('Updating complaint:', { complaintId, normalizedStatus, remarks, updatedBy });
    
    const allowedStatuses = ['pending', 'received', 'in_progress', 'resolved', 'rejected', 'escalated', 'disputed'];
    if (!allowedStatuses.includes(normalizedStatus)) {
      return { 
        status: 400, 
        data: { 
          error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` 
        } 
      };
    }

    // Start a Supabase transaction
    const { data: complaintData, error: complaintError } = await supabase
      .from('complaints')
      .update({ 
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
        ...(remarks ? { resolution_comment: remarks } : {}),
        ...(normalizedStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
      })
      .eq('id', complaintId)
      .select();

    if (complaintError) {
      console.error('Error updating complaint:', complaintError);
      if (complaintError.message === 'fetch failed' || complaintError.message?.includes('fetch')) {
        console.log('Falling back to local auth store for updating complaint status');
        return localDb.updateComplaintStatus(complaintId, normalizedStatus, remarks, updatedBy);
      }
      return { status: 400, data: { error: complaintError.message } };
    }

    // Create status update record
    const { data: statusUpdateData, error: statusUpdateError } = await supabase
      .from('status_updates')
      .insert([{
        complaint_id: complaintId,
        status: normalizedStatus,
        remarks,
        updated_by: updatedBy
      }])
      .select();

    if (statusUpdateError) {
      console.error('Error creating status update:', statusUpdateError);
      if (statusUpdateError.message === 'fetch failed' || statusUpdateError.message?.includes('fetch')) {
        console.log('Falling back to local auth store for status update record creation');
        return localDb.updateComplaintStatus(complaintId, normalizedStatus, remarks, updatedBy);
      }
      return { status: 400, data: { error: statusUpdateError.message } };
    }

    // Fetch the complete status history for the complaint
    const { data: statusHistory, error: historyError } = await supabase
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
          department
        )
      `)
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching status history:', historyError);
      if (historyError.message === 'fetch failed' || historyError.message?.includes('fetch')) {
        console.log('Falling back to local auth store for fetching status history after update');
        return localDb.updateComplaintStatus(complaintId, normalizedStatus, remarks, updatedBy);
      }
      return { status: 400, data: { error: historyError.message } };
    }

    console.log('Successfully updated complaint status:', {
      complaint: complaintData[0],
      statusUpdate: statusUpdateData[0],
      statusHistory
    });

    return { 
      status: 200, 
      data: {
        ...complaintData[0],
        statusHistory
      }
    };
  } catch (error) {
    console.error('Internal server error:', error);
    console.log('Falling back to local auth store for updateComplaintStatus due to catch');
    return localDb.updateComplaintStatus(complaintId, normalizedStatus, remarks, updatedBy);
  }
}

module.exports = { updateComplaintStatus };
