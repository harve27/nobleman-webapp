import React, { useState } from 'react'
import { Row, Col, Form, Button } from 'react-bootstrap'
import { db, auth } from './firebase'
import { query, collection, getDocs } from 'firebase/firestore'
import { signInWithEmailAndPassword } from "firebase/auth";

export default function SignIn({ setLoggedIn, setVolumeList }) {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    async function signIn() {
        try {
            await signInWithEmailAndPassword(auth, email, password)

            // Check if user is member of web staff
            const webStaffSnapshot = await getDocs(query(collection(db, 'web_staff')))
            const webStaffCopy = []
            webStaffSnapshot.forEach((doc) => webStaffCopy.push(doc.data().email))
            if (webStaffCopy.includes(email)) {
                await getVolumes()
                setLoggedIn(true)
            } else {
                console.log("Error! User is not a member of web staff")
            }
        } catch (error) {
            setError(error.message)
        }
    }

    async function getVolumes() {
        const volumeSnapshot = await getDocs(query(collection(db, 'volumes')))
        const volumeListCopy = []
        volumeSnapshot.forEach((doc) => volumeListCopy.push({value: doc.id, label: doc.id, id: doc.id}))
        setVolumeList(volumeListCopy)
      }

  return (
    <>
        <Row className="justify-content-md-center">
            <Col className="text-center pt-3">
            <h1>Nobleman Admin Dashboard</h1>
            <p>Please sign in below using your Nobles email and pin to access the dashboard!</p>
            </Col>
            </Row>
            <Row className="justify-content-md-center">
                <Col md={6}>
                <Form>
                    <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control type="email" placeholder="Enter email" onChange={(e) => setEmail(e.target.value)} />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formBasicPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
                    </Form.Group>
                    <Button variant="primary" type="button" onClick={() => signIn()}>
                    Submit
                    </Button>
                    {error !== "" && <p className="fw-bold" style={{'color': 'red'}}>{error}</p>}
                </Form>
                </Col>
        </Row>
    </>
  )
}
