import React, { useState } from "react";
import './LoginForm.css'
import { FaUser, FaLock, FaEnvelope } from "react-icons/fa"

const LoginForm = () => {

    const [action, setAction] = useState('');
    const registerLink = () => {
        setAction(' active');
    }

    const loginLink = () => {
        setAction('');
    }


    return (
        <div className={`wrapper${action}`}>
            <div className="form-box login">
                <form action="">
                    <h1>Login</h1>
                    <div className="input-box">
                        <input type="text" placeholder="Username" required></input>
                        <FaUser className="icon"></FaUser>
                    </div>
                    <div className="input-box">
                        <input type="password" placeholder="Password" required></input>
                        <FaLock className="icon"></FaLock>
                    </div>
                    <div className="remember-forgot">
                        <label><input type="checkbox"></input>Remember me</label>
                        <a href="#">Forgot password?</a>
                    </div>

                    <button type="submit">Login</button>
                    <div className="register-link">
                        <p>Don't have an account? <a href="#" onClick={registerLink}>Register</a></p>
                    </div>
                </form>
            </div>

            <div className="form-box register">
                <form action="">
                    <h1>Registraion</h1>
                    <div className="input-box">
                        <input type="text" placeholder="Username" required></input>
                        <FaUser className="icon"></FaUser>
                    </div>
                    <div className="input-box">
                        <input type="email" placeholder="Email" required></input>
                        <FaEnvelope className="icon"></FaEnvelope>
                    </div>
                    <div className="input-box">
                        <input type="password" placeholder="Password" required></input>
                        <FaLock className="icon"></FaLock>
                    </div>
                    <div className="input-box">
                        <input type="password" placeholder="Confirm password" required></input>
                        <FaLock className="icon"></FaLock>
                    </div>
                    <div className="remember-forgot">
                        <label><input type="checkbox" required></input>
                            I agree to the terms & conditions
                        </label>
                    </div>

                    <button type="submit">Register</button>
                    <div className="register-link">
                        <p>Already have an account? <a href="#" onClick={loginLink}>Login</a></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LoginForm

