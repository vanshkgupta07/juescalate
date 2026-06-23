const supabase = require('./supabaseClient');

async function disputeResolution(complaintId, reason, studentId) {
  try {
    // Start by fetching the complaint with its current authority details
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        *,
        current_authority:current_authority_id (
          id,
          name,
          department,
          authority_level
        )
      `)
      .eq('id', complaintId)
      .single();

    if (complaintError) {
      console.error('Error fetching complaint:', complaintError);
      return { status: 400, data: { error: complaintError.message } };
    }

    if (!complaint) {
      return { status: 404, data: { error: 'Complaint not found' } };
    }

    // If the complaint has no current authority, fetch the original authority details
    if (!complaint.current_authority) {
      const { data: originalAuthority, error: originalAuthorityError } = await supabase
        .from('user_profiles')
        .select('id, name, department, authority_level')
        .eq('id', complaint.authority_id)
        .single();

      if (originalAuthorityError) {
        console.error('Error fetching original authority:', originalAuthorityError);
        return { status: 400, data: { error: originalAuthorityError.message } };
      }

      complaint.current_authority = originalAuthority;
    }

    // If we still don't have authority info, handle the error
    if (!complaint.current_authority) {
      return { status: 400, data: { error: 'No authority found for this complaint' } };
    }

    // Check if there's a higher authority level available
    const { data: higherAuthority, error: authorityError } = await supabase
      .from('user_profiles')
      .select('id, name, department, authority_level')
      .eq('role', 'authority')
      .eq('department', complaint.current_authority.department)
      .gt('authority_level', complaint.current_authority.authority_level || 0)
      .order('authority_level', { ascending: true })
      .limit(1);

    if (authorityError) {
      console.error('Error checking for higher authority:', authorityError);
      return { status: 400, data: { error: authorityError.message } };
    }

    // Prepare previous authorities array with null checks
    let previousAuthorities = Array.isArray(complaint.previous_authorities) 
      ? complaint.previous_authorities 
      : [];

    if (complaint.current_authority) {
      previousAuthorities.push({
        id: complaint.current_authority.id,
        name: complaint.current_authority.name,
        department: complaint.current_authority.department,
        level: complaint.current_authority.authority_level,
        timestamp: new Date().toISOString()
      });
    }

    // Update the complaint
    const updates = {
      status: 'disputed',
      resolution_disputed: true,
      dispute_reason: reason,
      previous_authorities: previousAuthorities,
      updated_at: new Date().toISOString()
    };

    // If there's a higher authority, escalate to them
    if (higherAuthority && higherAuthority.length > 0) {
      const nextAuthority = higherAuthority[0];
      updates.current_authority_id = nextAuthority.id;
      updates.current_authority_level = nextAuthority.authority_level;
      updates.authority_id = nextAuthority.id;
      updates.authority_name = nextAuthority.name;
    }

    const { data: updatedComplaint, error: updateError } = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', complaintId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating complaint:', updateError);
      return { status: 400, data: { error: updateError.message } };
    }

    // Create status update record
    const { error: statusError } = await supabase
      .from('status_updates')
      .insert([{
        complaint_id: complaintId,
        status: 'disputed',
        remarks: reason,
        updated_by: studentId
      }]);

    if (statusError) {
      console.error('Error creating status update:', statusError);
      return { status: 400, data: { error: statusError.message } };
    }

    const responseMessage = higherAuthority && higherAuthority.length > 0
      ? `Complaint disputed and escalated to ${higherAuthority[0].name} (Level ${higherAuthority[0].authority_level})`
      : 'Complaint disputed and will be reviewed by the current authority';

    return { 
      status: 200, 
      data: { 
        message: responseMessage,
        complaint: updatedComplaint,
        escalatedTo: higherAuthority && higherAuthority.length > 0 ? higherAuthority[0] : null
      } 
    };
  } catch (error) {
    console.error('Internal server error:', error);
    return { 
      status: 500, 
      data: { 
        error: 'Internal server error',
        details: error.message 
      } 
    };
  }
}

module.exports = { disputeResolution };