// Simple logging service (no email functionality)
class LoggingService {
  logUserRegistration(email: string, name: string): void {
    console.log('\n' + '='.repeat(50))
    console.log('👤 NEW USER REGISTERED')
    console.log('='.repeat(50))
    console.log(`Email: ${email}`)
    console.log(`Name: ${name}`)
    console.log(`Time: ${new Date().toLocaleString()}`)
    console.log('='.repeat(50) + '\n')
  }

  logUserLogin(email: string, name: string): void {
    console.log(`🔐 User logged in: ${name} (${email})`)
  }
}

export default new LoggingService()