import { supabase } from '../config/supabase';

export interface SmsSession {
  id: string;
  phone_number: string;
  current_step: 'MAIN_MENU' | 'OFFICE_SELECT' | 'SERVICE_SELECT' | 'CONFIRM' | 'GET_NAME';
  selected_office_id?: string;
  selected_service_id?: string;
  user_name?: string;
  session_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export class SmsSessionManager {
  /**
   * Get or create a session for a phone number
   */
  static async getOrCreateSession(phoneNumber: string): Promise<SmsSession> {
    // Clean up expired sessions first
    await supabase
      .from('sms_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Try to get existing session
    const { data: existingSession } = await supabase
      .from('sms_sessions')
      .select('*')
      .eq('phone_number', phoneNumber)
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      return existingSession;
    }

    // Create new session
    const { data: newSession, error } = await supabase
      .from('sms_sessions')
      .insert({
        phone_number: phoneNumber,
        current_step: 'MAIN_MENU',
        session_data: {},
      })
      .select()
      .single();

    if (error) throw error;
    return newSession;
  }

  /**
   * Update session state
   */
  static async updateSession(
    sessionId: string,
    updates: Partial<Omit<SmsSession, 'id' | 'phone_number' | 'created_at'>>
  ): Promise<SmsSession> {
    const { data, error } = await supabase
      .from('sms_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    await supabase
      .from('sms_sessions')
      .delete()
      .eq('id', sessionId);
  }

  /**
   * Get or create SMS user
   */
  static async getOrCreateSmsUser(phoneNumber: string, name?: string): Promise<any> {
    // Try to get existing SMS user
    const { data: existingUser } = await supabase
      .from('sms_users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (existingUser) {
      // Update last used timestamp
      await supabase
        .from('sms_users')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', existingUser.id);
      return existingUser;
    }

    // Create new SMS user
    const { data: newUser, error } = await supabase
      .from('sms_users')
      .insert({
        phone_number: phoneNumber,
        name: name || `SMS User ${phoneNumber.slice(-4)}`,
      })
      .select()
      .single();

    if (error) throw error;
    return newUser;
  }
}
