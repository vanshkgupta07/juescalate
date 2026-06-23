const supabase = require('./supabaseClient');
const localDb = require('./localDb');

// Authentication functions
async function signUp(email, password, role, name, enroll_num, room_num, course, year) {
  try {
    console.log('Signup attempt:', { email, role, name, enroll_num, room_num, course, year });

    // Create new user with Supabase Auth. The backend uses the service role key,
    // so users are email-confirmed immediately for local/project demos.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        enroll_num,
        room_num,
        course,
        year
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      if (authError.message === 'fetch failed' || authError.message?.includes('fetch') || authError.status === 0) {
        console.log('Falling back to local auth store for signup due to fetch failure');
        return localDb.signUp({ email, password, role, name, enroll_num, room_num, course, year });
      }
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
        hostel_block: role === 'student' ? 'A' : null,
        course: course,
        year: year,
        department: role === 'authority' ? 'Hostel Administration' : null,
        authority_level: role === 'authority' ? 1 : null
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      if (profileError.message === 'fetch failed' || profileError.message?.includes('fetch')) {
        console.log('Falling back to local auth store for signup due to profile fetch failure');
        return localDb.signUp({ email, password, role, name, enroll_num, room_num, course, year });
      }
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { status: 400, data: { error: 'Profile creation failed: ' + profileError.message } };
    }

    console.log('Signup successful:', userProfile);
    return { 
      status: 201, 
      data: { 
        user: userProfile,
        session: null
      } 
    };
  } catch (error) {
    console.error('Signup catch error:', error);
    console.log('Falling back to local auth store for signup');
    return localDb.signUp({ email, password, role, name, enroll_num, room_num, course, year });
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
      if (error.message === 'fetch failed' || error.message?.includes('fetch') || error.status === 0) {
        console.log('Falling back to local auth store for signin due to fetch failure');
        return localDb.signIn(email, password, role);
      }
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
      if (profileError && (profileError.message === 'fetch failed' || profileError.message?.includes('fetch'))) {
        console.log('Falling back to local auth store for signin due to profile fetch failure');
        return localDb.signIn(email, password, role);
      }
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
    console.log('Falling back to local auth store for signin');
    return localDb.signIn(email, password, role);
  }
}

async function supabaseCheckAuth(token) {
  try {
    if (!token) return { status: 401, data: { error: 'No token provided' } };

    if (token.startsWith('local-')) {
      return localDb.checkAuth(token);
    }
    
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Auth check error:', error);
      if (error.message === 'fetch failed' || error.message?.includes('fetch') || error.status === 0) {
        return localDb.checkAuth(token);
      }
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
    return localDb.checkAuth(token);
  }
}

async function signOut(token) {
  try {
    if (token?.startsWith('local-')) {
      return localDb.signOut(token);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Signout error:', error);
      return { status: 400, data: { error: error.message } };
    }
    return { status: 200, data: { message: 'Signed out successfully' } };
  } catch (error) {
    console.error('Signout catch error:', error);
    return localDb.signOut(token);
  }
}

module.exports = {
  signUp,
  supabaseSignIn,
  supabaseCheckAuth,
  signOut
};
