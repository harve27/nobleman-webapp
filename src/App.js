import { useState, useEffect } from 'react'
import { db } from './firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Col, Row, Container, Button, ListGroup, Form } from 'react-bootstrap'
import Select from 'react-select'

function App() {

  const [editMode, setEditMode] = useState(null) // number corresponds to block position in content array
  const [volume, setVolume] = useState('')
  const [edition, setEdition] = useState('')
  const [articles, setArticles] = useState([])
  const [currentArticle, setCurrentArticle] = useState({})

  const volumes = [
    {value: '112', label: '112'},
    {value: '111', label: '111'},
    {value: '110', label: '110'},
  ]

  const editions = [
    {value: '1', label: '1'},
    {value: '2', label: '2'},
    {value: '3', label: '3'},
    {value: '4', label: '4'},
    {value: '5', label: '5'},
    {value: '6', label: '6'},
    {value: '7', label: '7'},
    {value: '8', label: '8'},
  ]

  async function getArticles() {
    const articleListSnap = await getDoc(doc(db, 'volumes', volume, 'editions', edition))
    setArticles(articleListSnap.data().articles)
  }

  async function showArticle(article) {
    const articleSnap = await getDoc(doc(db, 'volumes', volume, 'articles', article.tempId))  // TODO: Need to figure out how to pass temp ID
    console.log()
    console.log(articleSnap.data())
    setCurrentArticle(articleSnap.data())
  }

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col className="text-center pt-3">
          <h1>Nobleman Admin Dashboard</h1>
          <p>Use this interface to view, edit, and publish articles on the Nobles app.</p>
        </Col>
      </Row>
      <Row className="h-100">
        <Col md={4} style={{'borderRight': '1px solid gray', 'height':'800px', 'overflow': 'scroll'}}> {/** TODO: make height of page */}
          {/** Sort articles functionality */}
          <Row>
            <Col>
              <p><b>Volumes</b></p>
              <Select options={volumes} onChange={(e) => setVolume(e.value)} />
            </Col>
            <Col>
              <p><b>Editions</b></p>
              <Select options={editions} onChange={(e) => setEdition(e.value)} />
            </Col>
            <Col>
              <Button className="mt-4" onClick={() => getArticles()}>See articles!</Button>
            </Col>
          </Row>
          <Row className="mt-4">
            <ListGroup>
              {articles && articles.map((article) => 
                <ListGroup.Item action onClick={() => showArticle(article)}>
                  <h5><b>{article.title}</b></h5>
                  <p>{article.author.name}</p>
                </ListGroup.Item>
              )}
            </ListGroup>
          </Row>
        </Col>
        <Col md={8}>
          {Object.keys(currentArticle).length > 0 && (
            <Row>
              <h2 className="fw-bold fst-italic">{currentArticle.title}</h2>
              <h4 className="fw-normal">{currentArticle.author.name}</h4>
              {currentArticle.content.map((block) => {
                const blockIndex = currentArticle.content.indexOf(block)
                if (block.type === "paragraph") {
                  return <p onClick={() => setEditMode(blockIndex)}>
                    {editMode === blockIndex ? (
                      <div>
                        <Form.Control as="textarea" style={{'height': '100px'}}>{block.data.text}</Form.Control>
                        <Row className="mt-2 justify-content-left">
                          <Col md={2}>
                            <Button variant="success">Submit</Button>
                          </Col>
                          <Col md={2} className="">
                            <Button variant="danger">Delete Block</Button>
                          </Col>
                          <Col md={8}></Col>
                        </Row>
                      </div>
                    ) : <p>{block.data.text}</p>}
                  </p>
                } else if (block.type === "image") {
                  return <div>
                          <img className="img-fluid" src={block.data.url} alt="Nobleman" />
                          <p>{block.data.credit}</p>
                        </div>
                } else if (block.type === "quote") {
                  return <p className="fs-4 fst-italic">{block.data.text}</p>
                }
              })}
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default App;
