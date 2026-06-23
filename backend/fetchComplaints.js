const supabase = require('./supabaseClient');
const localDb = require('./localDb');

async function fetchStudentComplaints(studentId) {
  try {
    console.log('Fetching complaints for student:', studentId);
    
    // First get the complaints with joined authority data
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select(`
        *,
        authority:user_profiles!complaints_authority_id_fkey (
          name,
          department,
          authority_level
        ),
        student:user_profiles!complaints_student_id_fkey (
          name,
          room_num,
          hostel_block
        )
      `)
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching student complaints:', error);
      if (error.message === 'fetch failed' || error.message?.includes('fetch')) {
        console.log('Falling back to local auth store for student complaints');
        return { status: 200, data: localDb.getStudentComplaints(studentId) };
      }
      return { status: 400, data: { error: error.message } };
    }

    // Transform the data to match the frontend expectations
    const transformedComplaints = complaints.map(complaint => ({
      id: complaint.id,
      title: complaint.title,
      description: complaint.description,
      status: complaint.status,
      category: complaint.category,
      priority: complaint.priority,
      createdAt: complaint.created_at,
      updatedAt: complaint.updated_at,
      studentId: complaint.student_id,
      studentName: complaint.student?.name || 'Unknown Student',
      authorityId: complaint.authority_id,
      authorityName: complaint.authority?.name || 'Unassigned',
      currentAuthorityLevel: complaint.current_authority_level || 1,
      escalationHistory: complaint.escalation_history || [],
      statusHistory: [], // Initialize empty as we'll fetch this separately if needed
      resolvedAt: complaint.resolved_at,
      resolutionComment: complaint.resolution_comment,
      isDisputed: complaint.resolution_disputed,
      disputeReason: complaint.dispute_reason
    }));

    console.log('Transformed complaints:', transformedComplaints);
    return { status: 200, data: transformedComplaints };
  } catch (error) {
    console.error('Internal server error:', error);
    console.log('Falling back to local auth store for student complaints due to catch');
    return { status: 200, data: localDb.getStudentComplaints(studentId) };
  }
}

async function fetchAuthorityComplaints(authorityId) {
  try {
    console.log('Fetching complaints for authority:', authorityId);
    
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select(`
        *,
        student:user_profiles!complaints_student_id_fkey (
          name,
          room_num,
          hostel_block,
          course,
          year
        ),
        authority:user_profiles!complaints_authority_id_fkey (
          name,
          department,
          authority_level
        )
      `)
      .eq('authority_id', authorityId);

    if (error) {
      console.error('Error fetching authority complaints:', error);
      if (error.message === 'fetch failed' || error.message?.includes('fetch')) {
        console.log('Falling back to local auth store for authority complaints');
        return { status: 200, data: localDb.getAuthorityComplaints(authorityId) };
      }
      return { status: 400, data: { error: error.message } };
    }

    // Transform the data to match the frontend expectations
    const transformedComplaints = complaints.map(complaint => ({
      id: complaint.id,
      title: complaint.title,
      description: complaint.description,
      status: complaint.status,
      category: complaint.category,
      priority: complaint.priority,
      createdAt: complaint.created_at,
      updatedAt: complaint.updated_at,
      studentId: complaint.student_id,
      studentName: complaint.student?.name || 'Unknown Student',
      studentDetails: {
        roomNumber: complaint.student?.room_num,
        hostelBlock: complaint.student?.hostel_block,
        course: complaint.student?.course,
        year: complaint.student?.year
      },
      authorityId: complaint.authority_id,
      authorityName: complaint.authority?.name || 'Unassigned',
      authorityDepartment: complaint.authority?.department,
      currentAuthorityLevel: complaint.current_authority_level || 1,
      escalationHistory: complaint.escalation_history || [],
      statusHistory: [], // Initialize empty as we'll fetch this separately if needed
      resolvedAt: complaint.resolved_at,
      resolutionComment: complaint.resolution_comment,
      isDisputed: complaint.resolution_disputed,
      disputeReason: complaint.dispute_reason
    }));

    console.log('Transformed complaints:', transformedComplaints);
    return { status: 200, data: transformedComplaints };
  } catch (error) {
    console.error('Internal server error:', error);
    console.log('Falling back to local auth store for authority complaints due to catch');
    return { status: 200, data: localDb.getAuthorityComplaints(authorityId) };
  }
}

module.exports = { fetchStudentComplaints, fetchAuthorityComplaints };
