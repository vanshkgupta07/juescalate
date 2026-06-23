const supabase = require('./supabaseClient');

async function handleEscalation(complaintId, reason, authorityId) {
  try {
    // Get the complaint and current authority details
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

    // Get current authority level from the complaints table
    let currentAuthLevel = complaint.current_authority_level || 1;
    
    // Calculate next level
    const nextLevel = currentAuthLevel + 1;
    console.log('Escalating from level', currentAuthLevel, 'to level', nextLevel);

    // Find authority at the next level
    const { data: authorities, error: authorityError } = await supabase
      .from('user_profiles')
      .select('id, name, department, authority_level')
      .eq('role', 'authority')
      .eq('authority_level', nextLevel);

    if (authorityError) {
      console.error('Error finding next level authority:', authorityError);
      return { 
        status: 500, 
        data: { 
          error: 'Database error while finding next authority',
          details: authorityError.message 
        } 
      };
    }

    if (!authorities || authorities.length === 0) {
      console.log('No authority found at level:', nextLevel);
      return { 
        status: 400, 
        data: { 
          error: 'No higher level authority available',
          details: `No authority found at level ${nextLevel}`
        } 
      };
    }

    const nextAuthority = authorities[0];

    // Update previous authorities array
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

    // Update escalation history
    let escalationHistory = Array.isArray(complaint.escalation_history) 
      ? complaint.escalation_history 
      : [];

    escalationHistory.push({
      fromLevel: currentAuthLevel,
      toLevel: nextLevel,
      fromAuthority: complaint.current_authority?.name || 'Unknown',
      toAuthority: nextAuthority.name,
      reason: reason,
      timestamp: new Date().toISOString()
    });

    // Update the complaint
    const { data: updatedComplaint, error: updateError } = await supabase
      .from('complaints')
      .update({
        status: 'escalated',
        current_authority_id: nextAuthority.id,
        current_authority_level: nextLevel,
        authority_id: nextAuthority.id,
        authority_name: nextAuthority.name,
        previous_authorities: previousAuthorities,
        escalation_history: escalationHistory,
        updated_at: new Date().toISOString()
      })
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
        status: 'escalated',
        remarks: `Escalated to ${nextAuthority.name} (Level ${nextLevel}): ${reason}`,
        updated_by: authorityId
      }]);

    if (statusError) {
      console.error('Error creating status update:', statusError);
      return { status: 400, data: { error: statusError.message } };
    }

    return { 
      status: 200, 
      data: { 
        message: `Complaint escalated to ${nextAuthority.name} (Level ${nextLevel})`,
        complaint: updatedComplaint,
        newAuthority: {
          id: nextAuthority.id,
          name: nextAuthority.name,
          level: nextAuthority.authority_level,
          department: nextAuthority.department
        }
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

module.exports = { handleEscalation };