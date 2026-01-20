import { supabase } from '../config/supabase';
import { SmsSession, SmsSessionManager } from './smsSession';

export class SmsMenuService {
  /**
   * Process incoming SMS message and generate response
   */
  static async processMessage(phoneNumber: string, message: string): Promise<string> {
    const normalizedMessage = message.trim().toUpperCase();
    
    // Get or create session
    const session = await SmsSessionManager.getOrCreateSession(phoneNumber);

    // Handle CANCEL command at any step
    if (normalizedMessage === 'CANCEL' || normalizedMessage === '0') {
      await SmsSessionManager.deleteSession(session.id);
      return 'Your registration has been cancelled. Send START to begin again.';
    }

    // Handle HELP command
    if (normalizedMessage === 'HELP') {
      return this.getHelpMessage();
    }

    // Route to appropriate handler based on current step
    switch (session.current_step) {
      case 'MAIN_MENU':
        return this.handleMainMenu(session, normalizedMessage);
      
      case 'GET_NAME':
        return this.handleNameInput(session, message.trim());
      
      case 'OFFICE_SELECT':
        return this.handleOfficeSelect(session, normalizedMessage);
      
      case 'SERVICE_SELECT':
        return this.handleServiceSelect(session, normalizedMessage);
      
      case 'CONFIRM':
        return this.handleConfirmation(session, normalizedMessage);
      
      default:
        return this.getMainMenu();
    }
  }

  /**
   * Main menu handler
   */
  private static async handleMainMenu(session: SmsSession, message: string): Promise<string> {
    if (message === 'START' || message === '1') {
      // Ask for name first
      await SmsSessionManager.updateSession(session.id, {
        current_step: 'GET_NAME',
      });
      return 'Welcome to Virtual Queue System!\n\nPlease reply with your name:';
    }

    if (message === '2') {
      return this.handleCheckToken(session.phone_number);
    }

    return this.getMainMenu();
  }

  /**
   * Handle name input
   */
  private static async handleNameInput(session: SmsSession, name: string): Promise<string> {
    if (name.length < 2 || name.length > 100) {
      return 'Please enter a valid name (2-100 characters):';
    }

    await SmsSessionManager.updateSession(session.id, {
      current_step: 'OFFICE_SELECT',
      user_name: name,
    });

    return this.getOfficeMenu();
  }

  /**
   * Get list of offices
   */
  private static async getOfficeMenu(): Promise<string> {
    const { data: offices, error } = await supabase
      .from('offices')
      .select('id, name')
      .order('name');

    if (error || !offices || offices.length === 0) {
      return 'Sorry, no offices available at the moment. Please try again later.';
    }

    let menu = 'Select Office:\n\n';
    offices.forEach((office, index) => {
      menu += `${index + 1} - ${office.name}\n`;
    });
    menu += '\nReply with office number or 0 to cancel';

    return menu;
  }

  /**
   * Handle office selection
   */
  private static async handleOfficeSelect(session: SmsSession, message: string): Promise<string> {
    const officeNumber = parseInt(message);
    
    if (isNaN(officeNumber) || officeNumber < 1) {
      return 'Invalid selection. ' + await this.getOfficeMenu();
    }

    // Get offices list
    const { data: offices } = await supabase
      .from('offices')
      .select('id, name')
      .order('name');

    if (!offices || officeNumber > offices.length) {
      return 'Invalid office number. ' + await this.getOfficeMenu();
    }

    const selectedOffice = offices[officeNumber - 1];

    // Update session with selected office
    await SmsSessionManager.updateSession(session.id, {
      current_step: 'SERVICE_SELECT',
      selected_office_id: selectedOffice.id,
      session_data: {
        ...session.session_data,
        office_name: selectedOffice.name,
      },
    });

    return this.getServiceMenu();
  }

  /**
   * Get list of services
   */
  private static async getServiceMenu(): Promise<string> {
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name')
      .order('name');

    if (error || !services || services.length === 0) {
      return 'Sorry, no services available. Please try again later.';
    }

    let menu = 'Select Service:\n\n';
    services.forEach((service, index) => {
      menu += `${index + 1} - ${service.name}\n`;
    });
    menu += '\nReply with service number or 0 to cancel';

    return menu;
  }

  /**
   * Handle service selection
   */
  private static async handleServiceSelect(session: SmsSession, message: string): Promise<string> {
    console.log(`📝 Service selection - Message: "${message}", Session step: ${session.current_step}`);
    
    const serviceNumber = parseInt(message);
    console.log(`📝 Parsed service number: ${serviceNumber}`);
    
    if (isNaN(serviceNumber) || serviceNumber < 1) {
      console.log(`❌ Invalid number format`);
      return 'Invalid selection. ' + await this.getServiceMenu();
    }

    // Get services list
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name')
      .order('name');

    console.log(`📝 Services fetched: ${services?.length || 0}, Error: ${error?.message || 'none'}`);

    if (error || !services || services.length === 0) {
      console.error('❌ Error fetching services:', error);
      return 'Error loading services. ' + await this.getServiceMenu();
    }

    if (serviceNumber > services.length) {
      console.log(`❌ Service number ${serviceNumber} > ${services.length}`);
      return 'Invalid service number. ' + await this.getServiceMenu();
    }

    console.log(`✅ Selected service ${serviceNumber}: ${services[serviceNumber - 1].name}`);
    const selectedService = services[serviceNumber - 1];

    // Get office name for confirmation
    const { data: office } = await supabase
      .from('offices')
      .select('name')
      .eq('id', session.selected_office_id)
      .single();

    // Update session
    await SmsSessionManager.updateSession(session.id, {
      current_step: 'CONFIRM',
      selected_service_id: selectedService.id,
      session_data: {
        ...session.session_data,
        service_name: selectedService.name,
      },
    });

    return `Confirm Details:\n\nName: ${session.user_name}\nOffice: ${office?.name || 'N/A'}\nService: ${selectedService.name}\n\nReply YES to confirm or NO to cancel`;
  }

  /**
   * Handle confirmation
   */
  private static async handleConfirmation(session: SmsSession, message: string): Promise<string> {
    if (message !== 'YES' && message !== 'Y') {
      await SmsSessionManager.deleteSession(session.id);
      return 'Registration cancelled. Send START to begin again.';
    }

    try {
      // Create or get SMS user
      const smsUser = await SmsSessionManager.getOrCreateSmsUser(
        session.phone_number,
        session.user_name
      );

      // Create token using existing logic
      const token = await this.createToken(
        smsUser.id,
        session.selected_service_id!,
        session.selected_office_id!,
        session.phone_number,
        session.user_name || 'SMS User'
      );

      // Delete session
      await SmsSessionManager.deleteSession(session.id);

      // Get wait time estimate
      const { data: queueInfo } = await supabase
        .from('tokens')
        .select('position_in_queue')
        .eq('service_id', session.selected_service_id)
        .eq('status', 'WAITING');

      const position = token.position_in_queue || 0;
      const waitMinutes = position * 5; // Rough estimate

      return `✓ Token Created!\n\nToken: ${token.token_label}\nPosition: ${position}\nEst. Wait: ~${waitMinutes} min\n\nWe'll SMS you when it's your turn!\n\nSend START for new token`;
    } catch (error: any) {
      console.error('Token creation error:', error);
      await SmsSessionManager.deleteSession(session.id);
      return `Error creating token: ${error.message}\n\nSend START to try again.`;
    }
  }

  /**
   * Create token (integrates with existing system)
   */
  private static async createToken(
    userId: string,
    serviceId: string,
    officeId: string,
    phoneNumber: string,
    userName: string
  ): Promise<any> {
    // Get service details
    const { data: service } = await supabase
      .from('services')
      .select('name')
      .eq('id', serviceId)
      .single();

    // Generate simple token label
    const timestamp = Date.now().toString().slice(-4);
    const tokenLabel = `${service?.name.substring(0, 3).toUpperCase() || 'TOK'}-${timestamp}`;

    // Calculate position (NORMAL priority)
    const { count } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', serviceId)
      .eq('status', 'waiting');

    const position = (count || 0) + 1;

    // Create token (citizen_id is null for SMS-only users)
    const { data: token, error } = await supabase
      .from('tokens')
      .insert({
        citizen_name: userName,
        citizen_id: null, // SMS users don't have a full user account
        service_id: serviceId,
        token_label: tokenLabel,
        priority: 'NORMAL',
        status: 'waiting',
        position_in_queue: position,
        citizen_phone: phoneNumber,
      })
      .select()
      .single();

    if (error) throw error;
    return token;
  }

  /**
   * Check token status
   */
  private static async handleCheckToken(phoneNumber: string): Promise<string> {
    const { data: tokens } = await supabase
      .from('tokens')
      .select(`
        token_label,
        position_in_queue,
        status,
        services (name)
      `)
      .eq('citizen_phone', phoneNumber)
      .eq('status', 'WAITING')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!tokens || tokens.length === 0) {
      return 'No active tokens found.\n\nSend START to register for a new token.';
    }

    const token = tokens[0];
    const waitMinutes = (token.position_in_queue || 0) * 5;

    return `Your Token: ${token.token_label}\nStatus: ${token.status}\nPosition: ${token.position_in_queue}\nEst. Wait: ~${waitMinutes} min\n\nSend START for new token`;
  }

  /**
   * Get main menu
   */
  private static getMainMenu(): Promise<string> {
    return Promise.resolve(
      'Virtual Queue System\n\n' +
      '1 - Register for Token\n' +
      '2 - Check My Token\n' +
      '0 - Cancel\n\n' +
      'Reply with your choice'
    );
  }

  /**
   * Get help message
   */
  private static getHelpMessage(): string {
    return 'SMS Queue Registration\n\n' +
      'Commands:\n' +
      'START or 1 - Register\n' +
      '2 - Check token\n' +
      'HELP - This message\n' +
      'CANCEL or 0 - Cancel\n\n' +
      'Send START to begin';
  }
}
