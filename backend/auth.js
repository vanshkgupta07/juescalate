const supabase = require('./supabaseClient');

// Authentication functions
async function signUp(email, password, role, name, enroll_num, room_num, course, year) {
  try {
    console.log('Signup attempt:', { email, role, name, enroll_num, room_num, course, year });

    // Create new user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          enroll_num,
          room_num, 
          course,
          year
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return { status: 400, data: { error: authError.message } };
    }

    if (!authData.user) {
      return { status: 400, data: { error: 'User creation failed' } };
    }

    // Create the user profile directly
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authData.user.id,
        email: email,
        name: name,
        role: role,
        enroll_num: enroll_num,
        room_num: room_num,
        course: course,
        year: year
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { status: 400, data: { error: 'Profile creation failed: ' + profileError.message } };
    }

    console.log('Signup successful:', userProfile);
    return { 
      status: 201, 
      data: { 
        user: userProfile,
        session: authData.session 
      } 
    };
  } catch (error) {
    console.error('Signup catch error:', error);
    return { status: 500, data: { error: 'Internal server error: ' + error.message } };
  }
}

async function supabaseSignIn(email, password, role) {
  try {
    console.log('Signin attempt:', { email, role });

    // First attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error('Signin auth error:', error);
      return { status: 401, data: { error: error.message } };
    }

    // Check if the user has the correct role
    const { data: userData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !userData) {
      console.error('Profile fetch error:', profileError);
      await supabase.auth.signOut();
      return { status: 401, data: { error: 'User profile not found' } };
    }

    if (userData.role !== role) {
      console.error('Role mismatch:', userData.role, 'expected:', role);
      await supabase.auth.signOut();
      return { status: 403, data: { error: 'Invalid role for this user' } };
    }

    console.log('Signin successful:', userData);
    return { 
      status: 200, 
      data: { 
        user: userData, 
        session: data.session,
        profile: userData 
      } 
    };
  } catch (error) {
    console.error('Signin catch error:', error);
    return { status: 500, data: { error: 'Internal server error: ' + error.message } };
  }
}

async function supabaseCheckAuth(token) {
  try {
    if (!token) return { status: 401, data: { error: 'No token provided' } };
    
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Auth check error:', error);
      return { status: 401, data: { error: error.message } };
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return { 
      status: 200, 
      data: { 
        user: data.user,
        profile: userProfile 
      } 
    };
  } catch (error) {
    console.error('Check auth catch error:', error);
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Signout error:', error);
      return { status: 400, data: { error: error.message } };
    }
    return { status: 200, data: { message: 'Signed out successfully' } };
  } catch (error) {
    console.error('Signout catch error:', error);
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

module.exports = {
  signUp,
  supabaseSignIn,
  supabaseCheckAuth,
  signOut
};