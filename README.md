# TUK Smart ID System

A comprehensive NFC-based access control system designed for the Technical University of Kenya (TUK). This system enables secure student identification and access management through smart ID cards, with integrated fee status verification and real-time activity logging.

## Features

### Core Functionality
- **NFC Card Verification**: Real-time scanning and validation of student ID cards
- **Fee Status Integration**: Automatic access control based on student fee payment status
- **Activity Logging**: Comprehensive logging of all access attempts with timestamps
- **Real-time Dashboard**: Live monitoring interface for security personnel

### Student Portal
- **Personal Profile Access**: Students can view their profile information and fee status
- **Access History**: Detailed history of card taps with timestamps and outcomes
- **Self-Service Interface**: Easy-to-use portal for students to check their access status

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MySQL
- **Frontend**: HTML, CSS (Tailwind CSS), JavaScript
- **Styling**: TUK Green and White theme for brand consistency

## Prerequisites

Before running this application, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [MySQL](https://www.mysql.com/) or [XAMPP](https://www.apachefriends.org/) (which includes MySQL)
- A web browser (Chrome, Firefox, Edge, etc.)

## Installation

1. **Clone or Download the Repository**
   ```bash
   git clone <repository-url>
   cd smart-id-system
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Start your MySQL server (if using XAMPP, start Apache and MySQL modules)
   - Create a database named `smart_id_system`
   - Create the required tables:

   ```sql
   CREATE TABLE students (
       nfc_uid VARCHAR(255) PRIMARY KEY,
       student_name VARCHAR(255) NOT NULL,
       reg_number VARCHAR(255) UNIQUE NOT NULL,
       fee_status TINYINT(1) NOT NULL DEFAULT 0
   );

   CREATE TABLE access_logs (
       id INT AUTO_INCREMENT PRIMARY KEY,
       student_name VARCHAR(255) NOT NULL,
       reg_number VARCHAR(255) NOT NULL,
       status VARCHAR(50) NOT NULL,
       access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. **Configure Database Connection**
   - The application connects to MySQL on localhost with default credentials (root, no password)
   - If your MySQL setup differs, update the connection details in `server.js`

## Running the Application

1. **Start the Server**
   ```bash
   node server.js
   ```

   You should see:
   ```
   Server running on port 3000
   Backend Ready & Logging Active.
   ```

2. **Access the Application**
   - Open your web browser and navigate to `http://localhost:3000` or directly open `index.html`
   - For the student portal, click the "Student Portal" link or navigate to `student.html`

## Usage

### Security Terminal (index.html)
- Enter or scan NFC UID in the verification terminal
- Click "Verify Student Identity" to check access
- View real-time activity logs in the right panel
- Use the search bar to filter logs by student name

### Student Portal (student.html)
- Enter your registration number (e.g., AIIM/00476/2021)
- Click "View My Profile" to see your information
- View your fee status (Cleared/Pending) and recent card taps

## API Endpoints

- `POST /verify` - Verify student access by NFC UID
- `GET /logs` - Retrieve recent access logs
- `GET /student/:reg_number` - Get student profile and access history

## Project Structure

```
smart-id-system/
├── index.html          # Main security terminal interface
├── student.html        # Student portal interface
├── server.js           # Node.js backend server
├── package.json        # Node.js dependencies
├── style.css           # Additional styles (currently empty)
├── README.md           # This file
└── .gitignore          # Git ignore rules
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is developed for the Technical University of Kenya. Please contact the university for usage permissions.

## Support

For technical support or questions, please contact the TUK IT Department.