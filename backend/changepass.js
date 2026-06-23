const supabase = require('./supabaseClient');
const localDb = require('./localDb');

// Change password function
async function changePassword(userId, currentPassword, newPassword) {
  try {
    if (userId?.startsWith('local-')) {
      return localDb.changePassword(userId, currentPassword, newPassword);
    }

    // Get user email from userId
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single();
    if (userError || !userData) {
      return { status: 404, data: { error: 'User not found' } };
    }
    const email = userData.email;

    // Verify current password by signing in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) {
      return { status: 401, data: { error: 'Current password is incorrect' } };
    }

    // Change password as an admin because this endpoint runs on the backend.
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (updateError) {
      return { status: 400, data: { error: updateError.message } };
    }
    return { status: 200, data: { message: 'Password changed successfully' } };
  } catch (error) {
    return localDb.changePassword(userId, currentPassword, newPassword);
  }
}

module.exports = { changePassword };
