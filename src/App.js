import { useState, useEffect } from 'react'
import { db } from './firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Col, Row, Container, Button, ListGroup, Form, Popover, OverlayTrigger, ButtonGroup } from 'react-bootstrap'
import Select from 'react-select'
import './App.css'

function App() {

  const [editMode, setEditMode] = useState(null) // number corresponds to block position in content array
  const [editAuthor, setEditAuthor] = useState(false)
  const [editTitle, setEditTitle] = useState(false)


  const [addParagraph, setAddParagraph] = useState(null)
  const [addImage, setAddImage] = useState(null)
  const [addQuote, setAddQuote] = useState(null)
  const [image, setImage] = useState(null)


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

  function onImageChange(e) {
    const imageFile = e.target.files[0]
    setImage(URL.createObjectURL(imageFile));
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
        <Col className="p-4" md={8} style={{'backgroundColor': '#fcf1dc'}}>
          {Object.keys(currentArticle).length > 0 && (
            <Row>
              {editTitle ? (
                <div>
                  <Form.Control as="text">{currentArticle.title}</Form.Control>
                  <Row className="justify-content-start mt-2 mb-2">
                    <Col md={1}>
                      <Button variant="success">Submit</Button>
                    </Col>
                    <Col md={1} style={{'margin-left': '20px'}}>
                      <Button variant="primary" onClick={() => setEditTitle(false)}>Cancel</Button>
                    </Col>
                  </Row>
                </div>
              ) : <h2 onClick={() => setEditTitle(true)} className="fw-bold fst-italic">{currentArticle.title}</h2>}
              {editAuthor ? (
                <div className="mb-3">
                  <Form.Control as="text">{currentArticle.author.name}</Form.Control>
                  <Row className="justify-content-start mt-2 mb-2">
                    <Col md={1}>
                      <Button variant="success">Submit</Button>
                    </Col>
                    <Col md={1} style={{'margin-left': '20px'}}>
                      <Button variant="primary" onClick={() => setEditAuthor(false)}>Cancel</Button>
                    </Col>
                  </Row>
                </div>
              ) : <h4 onClick={() => setEditAuthor(true)} className="fw-normal mb-3">{currentArticle.author.name}</h4>}
              {currentArticle.content.map((block) => {
                const blockIndex = currentArticle.content.indexOf(block)
                if (block.type === "paragraph") {
                  return <div>
                    {editMode === blockIndex ? (
                      <>
                        <Form.Control as="textarea" style={{'height': '100px'}}>{block.data.text}</Form.Control>
                        <Row className="mt-2 justify-content-center">
                          <Col xs={2}>
                            <Button variant="success">Submit</Button>
                          </Col>
                          <Col xs={2}>
                            <Button variant="danger">Delete</Button>
                          </Col>
                          <Col xs={2}>
                            <Button variant="primary" onClick={() => setEditMode(null)}>Cancel</Button>
                          </Col>
                        </Row>
                      </>
                    ) : <>
                      <p onClick={() => setEditMode(blockIndex)}>{block.data.text}</p>
                      <Row className="add-block justify-content-center mt-2">
                        <hr></hr>
                        <Col className="add-block-button" md={1}>
                          <OverlayTrigger trigger="click" placement="right" overlay={
                            <Popover id="popover-basic">
                              <Popover.Body>
                                <ButtonGroup>
                                  <Button onClick={() => setAddParagraph(blockIndex)}>Paragraph</Button>
                                  <Button onClick={() => setAddImage(blockIndex)}>Image</Button>
                                  <Button onClick={() => setAddQuote(blockIndex)}>Quote</Button>
                                </ButtonGroup>
                              </Popover.Body>
                            </Popover>}>
                            <Button style={{'borderRadius': '50%', 'margin-top': '-60px'}} variant="info">+</Button>                          
                          </OverlayTrigger>
                          </Col>
                      </Row>
                      {addParagraph === blockIndex ? <>
                        <Form.Control as="textarea"></Form.Control>
                        <Row className="mt-2 mb-3 justify-content-center">
                            <Col xs={2}>
                              <Button variant="success">Add Content</Button>
                            </Col>
                            <Col xs={2}>
                              <Button variant="primary" onClick={() => setAddParagraph(null)}>Cancel</Button>
                            </Col>
                          </Row>
                      </> : addQuote === blockIndex ? <>
                        <Form.Control as="textarea"></Form.Control>
                        <Row className="mt-2 mb-3 justify-content-center">
                            <Col xs={2}>
                              <Button variant="success">Add Content</Button>
                            </Col>
                            <Col xs={2}>
                              <Button variant="primary" onClick={() => setAddQuote(null)}>Cancel</Button>
                            </Col>
                          </Row>
                      </> : addImage === blockIndex && <>
                            {image && <img className="img-fluid" src={image} alt="Nobleman"/>}
                            <input type="file" accept="image/*" onChange={onImageChange} />
                            <Row className="mt-2 mb-3 justify-content-center">
                              <Col xs={2}>
                                <Button variant="success" disabled={image === null}>Add Content</Button>
                              </Col>
                              <Col xs={2}>
                                <Button variant="primary" onClick={() => { setAddImage(null); setImage(null) }}>Cancel</Button>
                              </Col>
                            </Row>
                      </>}
                    </>}
                  </div>
                } else if (block.type === "image") {
                  return <div>
                    {editMode === blockIndex ? (
                      <>
                        <img className="img-fluid" style={{'opacity': '0.5'}} src={block.data.url} alt="Nobleman" />
                        <p className="text-center mt-2 fst-italic"><b>Credit:</b> {block.data.credit}</p>
                        <Row className="mt-2 mb-3 justify-content-center">
                          <Col xs={2}>
                            <Button variant="success">Change Photo</Button>
                          </Col>
                          <Col xs={2}>
                            <Button variant="danger">Delete</Button>
                          </Col>
                          <Col xs={2}>
                            <Button variant="primary" onClick={() => setEditMode(null)}>Cancel</Button>
                          </Col>
                        </Row>
                      </>
                    ) : (
                      <>
                        <div onClick={() => setEditMode(blockIndex)}>
                          <img className="img-fluid" src={block.data.url} alt="Nobleman" />
                          <p className="text-center mt-2 fst-italic"><b>Credit:</b> {block.data.credit}</p>
                        </div>
                        <Row className="add-block justify-content-center mt-2">
                          <hr></hr>
                          <Col className="add-block-button" md={1}>
                            <OverlayTrigger trigger="click" placement="right" overlay={
                              <Popover id="popover-basic">
                                <Popover.Body>
                                  <ButtonGroup>
                                    <Button onClick={() => setAddParagraph(blockIndex)}>Paragraph</Button>
                                    <Button onClick={() => setAddImage(blockIndex)}>Image</Button>
                                    <Button onClick={() => setAddQuote(blockIndex)}>Quote</Button>
                                  </ButtonGroup>
                                </Popover.Body>
                              </Popover>}>
                              <Button style={{'borderRadius': '50%', 'margin-top': '-60px'}} variant="info">+</Button>                          
                            </OverlayTrigger>
                            </Col>
                        </Row>
                        {addParagraph === blockIndex ? <>
                        <Form.Control as="textarea"></Form.Control>
                          <Row className="mt-2 mb-3 justify-content-center">
                              <Col xs={2}>
                                <Button variant="success">Add Content</Button>
                              </Col>
                              <Col xs={2}>
                                <Button variant="primary" onClick={() => setAddParagraph(null)}>Cancel</Button>
                              </Col>
                            </Row>
                        </> : addQuote === blockIndex ? <>
                          <Form.Control as="textarea"></Form.Control>
                          <Row className="mt-2 mb-3 justify-content-center">
                              <Col xs={2}>
                                <Button variant="success">Add Content</Button>
                              </Col>
                              <Col xs={2}>
                                <Button variant="primary" onClick={() => setAddQuote(null)}>Cancel</Button>
                              </Col>
                            </Row>
                        </> : addImage === blockIndex && <>
                              {image && <img className="img-fluid" src={image} alt="Nobleman"/>}
                              <input type="file" accept="image/*" onChange={onImageChange} />
                              <Row className="mt-2 mb-3 justify-content-center">
                                <Col xs={2}>
                                  <Button variant="success" disabled={image === null}>Add Content</Button>
                                </Col>
                                <Col xs={2}>
                                  <Button variant="primary" onClick={() => { setAddImage(null); setImage(null) }}>Cancel</Button>
                                </Col>
                              </Row>
                        </>}
                      </>
                    )}
                  </div>
                } else if (block.type === "quote") {
                  return <div>
                    {editMode === blockIndex ? (
                      <>
                        <Form.Control as="textarea">{block.data.text}</Form.Control>
                        <Row className="mt-2 mb-3 justify-content-center">
                            <Col xs={2}>
                              <Button variant="success">Submit</Button>
                            </Col>
                            <Col xs={2}>
                              <Button variant="danger">Delete</Button>
                            </Col>
                            <Col xs={2}>
                              <Button variant="primary" onClick={() => setEditMode(null)}>Cancel</Button>
                            </Col>
                          </Row>
                      </>
                    ) : <>
                        <p onClick={() => setEditMode(blockIndex)} className="fs-4 fst-italic">{block.data.text}</p>
                        <Row className="add-block justify-content-center mt-2">
                          <hr></hr>
                          <Col className="add-block-button" md={1}>
                            <OverlayTrigger trigger="click" placement="right" overlay={
                              <Popover id="popover-basic">
                                <Popover.Body>
                                  <ButtonGroup>
                                    <Button onClick={() => setAddParagraph(blockIndex)}>Paragraph</Button>
                                    <Button onClick={() => setAddImage(blockIndex)}>Image</Button>
                                    <Button onClick={() => setAddQuote(blockIndex)}>Quote</Button>
                                  </ButtonGroup>
                                </Popover.Body>
                              </Popover>}>
                              <Button style={{'borderRadius': '50%', 'margin-top': '-60px'}} variant="info">+</Button>                          
                            </OverlayTrigger>
                            </Col>
                        </Row>
                        {addParagraph === blockIndex ? <>
                        <Form.Control as="textarea"></Form.Control>
                          <Row className="mt-2 mb-3 justify-content-center">
                              <Col xs={2}>
                                <Button variant="success">Add Content</Button>
                              </Col>
                              <Col xs={2}>
                                <Button variant="primary" onClick={() => setAddParagraph(null)}>Cancel</Button>
                              </Col>
                            </Row>
                        </> : addQuote === blockIndex ? <>
                          <Form.Control as="textarea"></Form.Control>
                          <Row className="mt-2 mb-3 justify-content-center">
                              <Col xs={2}>
                                <Button variant="success">Add Content</Button>
                              </Col>
                              <Col xs={2}>
                                <Button variant="primary" onClick={() => setAddQuote(null)}>Cancel</Button>
                              </Col>
                            </Row>
                        </> : addImage === blockIndex && <>
                              {image && <img className="img-fluid" src={image} alt="Nobleman"/>}
                              <input type="file" accept="image/*" onChange={onImageChange} />
                              <Row className="mt-2 mb-3 justify-content-center">
                                <Col xs={2}>
                                  <Button variant="success" disabled={image === null}>Add Content</Button>
                                </Col>
                                <Col xs={2}>
                                  <Button variant="primary" onClick={() => { setAddImage(null); setImage(null) }}>Cancel</Button>
                                </Col>
                              </Row>
                        </>}
                      </>}
                  </div>
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
