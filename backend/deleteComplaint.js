const supabase = require('./supabaseClient');

async function deleteComplaint(complaintId, studentId) {
  try {
    // Check if the complaint belongs to the student
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('student_id, status')
      .eq('id', complaintId)
      .single();
      
    if (fetchError) {
      return { status: 404, data: { error: 'Complaint not found' } };
    }
    
    if (complaint.student_id !== studentId) {
      return { status: 403, data: { error: 'You can only delete your own complaints' } };
    }
    
    // Allow deletion of any complaint except resolved ones
    if (complaint.status === 'resolved') {
      return { status: 400, data: { error: 'Resolved complaints cannot be deleted' } };
    }

    
    // Delete the complaint (cascade will handle status_updates)
    const { error: deleteError } = await supabase
      .from('complaints')
      .delete()
      .eq('id', complaintId);
      
    if (deleteError) {
      return { status: 500, data: { error: deleteError.message } };
    }
    
    return { status: 200, data: { message: 'Complaint deleted successfully' } };
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

module.exports = { deleteComplaint };
