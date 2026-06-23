const express = require('express');
const router = express.Router();
const { supabase } = require('./supabaseClient');
const authenticateToken = require('./auth');

router.post('/', authenticateToken, async (req, res) => {
  const { complaintId, reason } = req.body;
  const userId = req.user.id;

  try {
    // First, get the complaint and authority details
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        *,
        current_authority:current_authority_id(id, name, authority_level),
        previous_authority:authority_id(id, name, authority_level),
        student:student_id(id)
      `)
      .eq('id', complaintId)
      .single();

    if (complaintError) throw complaintError;

    // Verify the requesting user is the student who filed the complaint
    if (complaint.student.id !== userId) {
      return res.status(403).json({
        error: 'Only the student who filed the complaint can request escalation'
      });
    }

    // Get current authority level
    const currentAuthorityId = complaint.current_authority_id || complaint.authority_id;
    const { data: currentAuthority } = await supabase
      .from('user_profiles')
      .select('authority_level')
      .eq('id', currentAuthorityId)
      .single();

    // Find the next authority level
    const { data: authorities, error: authorityError } = await supabase
      .from('user_profiles')
      .select('id, name, authority_level')
      .eq('role', 'authority')
      .gt('authority_level', currentAuthority.authority_level)
      .order('authority_level', { ascending: true })
      .limit(1);

    if (!authorities || authorities.length === 0) {
      return res.status(400).json({
        error: 'No higher level authority available'
      });
    }

    const nextAuthority = authorities[0];

    if (authorityError) {
      if (authorityError.message.includes('returns no result')) {
        return res.status(400).json({
          error: 'No higher level authority available'
        });
      }
      throw authorityError;
    }

    // Use the handle_complaint_escalation function
    const { error: escalationError } = await supabase.rpc('handle_complaint_escalation', {
      complaint_id: complaintId,
      new_authority_id: nextAuthority.id,
      escalation_reason: reason,
      previous_authority_id: complaint.current_authority_id || complaint.authority_id
    });

    if (escalationError) {
      console.error('Escalation function error:', escalationError);
      throw escalationError;
    }

    // Get the updated complaint to return in response
    const { data: updatedComplaint, error: fetchError } = await supabase
      .from('complaints')
      .select(`
        *,
        current_authority:current_authority_id(
          id,
          name,
          authority_level
        )
      `)
      .eq('id', complaintId)
      .single();

    if (fetchError) throw fetchError;

    return res.status(200).json({
      message: 'Complaint escalated successfully',
      complaint: updatedComplaint,
      newAuthorityName: newAuthority.name,
      newAuthorityLevel: newAuthority.authority_level
    });

  } catch (error) {
    console.error('Escalation error:', error);
    return res.status(500).json({
      error: 'Failed to escalate complaint',
      details: error.message
    });
  }
});

router.post('/dispute', authenticateToken, async (req, res) => {
  const { complaintId, reason } = req.body;
  const studentId = req.user.id;

  try {
    // Verify this is the student's complaint
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select('student_id, status')
      .eq('id', complaintId)
      .single();

    if (complaintError) throw complaintError;

    if (complaint.student_id !== studentId) {
      return res.status(403).json({
        error: 'Only the complaint owner can dispute the resolution'
      });
    }

    if (complaint.status !== 'resolved') {
      return res.status(400).json({
        error: 'Only resolved complaints can be disputed'
      });
    }

    // Handle the dispute using our function
    const { error: disputeError } = await supabase.rpc('handle_complaint_dispute', {
      complaint_id: complaintId,
      dispute_reason: reason
    });

    if (disputeError) throw disputeError;

    return res.status(200).json({
      message: 'Complaint resolution disputed successfully'
    });

  } catch (error) {
    console.error('Dispute error:', error);
    return res.status(500).json({
      error: 'Failed to dispute complaint resolution',
      details: error.message
    });
  }
});

module.exports = router;