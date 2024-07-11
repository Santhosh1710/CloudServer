
# CloudServer

[![GitHub](https://img.shields.io/badge/GitHub-CloudServer-blue.svg)](https://github.com/your-username/CloudServer)

CloudServer is a Node.js and Express-based server application with MongoDB that provides robust functionalities for managing files and user authentication.

## Features

- **Email Verification:** Verify user emails during registration to ensure validity.
- **JWT Authentication:** Secure API endpoints with JSON Web Tokens for authentication.
- **CRUD Operations:** Perform Create, Read, Update, and Delete operations through RESTful APIs.
- **File Uploads:** Allow users to upload files of any format.
- **File Preview:** Preview uploaded files directly within the platform.
- **File Sharing:** Share files with other registered users and external parties using shareable links.

## Technologies Used

- Node.js
- Express
- MongoDB

## Getting Started

To get a local copy up and running, follow these steps:

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/CloudServer.git
   ```

2. **Install dependencies**

   ```bash
   cd CloudServer
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory and add the following:

   ```plaintext
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/cloudserver
   JWT_SECRET=your_jwt_secret
   ```

   Replace `your_jwt_secret` with your preferred JWT secret.

4. **Run the server**

   ```bash
   npm start
   ```

5. **Testing**

   Use tools like Postman to test the APIs at `http://localhost:3000`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
