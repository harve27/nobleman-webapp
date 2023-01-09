import { useState } from 'react'
import { db, storage, auth } from './firebase'
import { doc, getDoc, updateDoc, query, collection, getDocs, where, addDoc, arrayUnion, deleteDoc } from 'firebase/firestore'
import { deleteObject, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { signInWithEmailAndPassword } from "firebase/auth";
import { Col, Row, Container, Button, ListGroup, Form, Popover, ButtonGroup, Modal, Overlay } from 'react-bootstrap'
import { v4 as uuidv4 } from 'uuid';
import Select from 'react-select'
import Toggle from 'react-toggle'
import './App.css'
import "react-toggle/style.css"

function App() {

  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [editMode, setEditMode] = useState(null) // number corresponds to block position in content array
  const [editAuthorMode, setEditAuthorMode] = useState(false)
  const [editTitleMode, setEditTitleMode] = useState(false)


  const [addParagraph, setAddParagraph] = useState(null)
  const [addImage, setAddImage] = useState(null)
  const [addQuote, setAddQuote] = useState(null)
  
  const [title, setTitle] = useState(null)
  const [author, setAuthor] = useState(null)
  const [paragraph, setParagraph] = useState(null)
  const [quote, setQuote] = useState(null)
  const [imageURL, setImageURL] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [credit, setCredit] = useState(null)
  const [isPublished, setIsPublished] = useState(null)

  const [volume, setVolume] = useState('')
  const [edition, setEdition] = useState('')
  const [articles, setArticles] = useState(null)
  const [currentArticle, setCurrentArticle] = useState({})
  const [currentArticleId, setCurrentArticleId] = useState(0)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddBlock, setShowAddBlock] = useState(null)
  const [targetAddBlock, setTargetAddBlock] = useState(null)
  const [authorList, setAuthorList] = useState([])

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

  async function signIn() {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setLoggedIn(true)
    } catch (error) {
      setError(error.message)
    }
  }

  async function getArticles() {
    const articleListSnap = await getDoc(doc(db, 'volumes', volume, 'editions', edition))
    setArticles(articleListSnap.data().articles)
  }

  async function showArticle(article) {
    const articleSnap = await getDoc(doc(db, article.id.path))
    setIsPublished(article.published)
    setCurrentArticle(articleSnap.data())
    setCurrentArticleId(article.id.path.split('/').at(-1))
  }

  async function createArticle() {
    const authorId = `volumes/${volume}/authors/${authorList.find(elem => elem.value === author).id}`
    
    // LOCAL: set currentArticle to newArticle
    const newArticle = {
      author: {
        id: doc(db, authorId),
        name: author
      },
      content: [],
      title: title,
      published: false,
      views: 0,
      datePublished: new Date()
    }
    setCurrentArticle(newArticle)

    // DB: add new document to articles collection
    const articleRef = await addDoc(collection(db, 'volumes', volume, 'articles'), newArticle)
    const articleId = `volumes/${volume}/articles/${articleRef.id}`
    setCurrentArticleId(articleRef.id)

    // LOCAL: update articles state
    const articlesCopy = articles
    articlesCopy.push({
      author: {
        id: doc(db, authorId),
        name: author
      },
      published: false,
      title: title,
      id: doc(db, articleId),
    })
    setArticles(articlesCopy)

    // DB: update edition document
    await updateDoc(doc(db, 'volumes', volume, 'editions', edition), {
      articles: articlesCopy
    })

    // DB: add article to author document
    await updateDoc(doc(db, authorId), {
      articles: arrayUnion({
        id: doc(db, articleId),
        title: title,
      })
    })

    setShowCreateModal(false)
  }

  async function deleteArticle() {
    // LOCAL: Set current article to null
    setCurrentArticle({})

    // LOCAL: Remove from articles
    const articlesCopy = articles
    const articleIndex = articlesCopy.indexOf(articlesCopy.find(elem => elem.title === title))
    articlesCopy.splice(articleIndex, 1)
    setArticles(articles)

    console.log(currentArticleId)

    // DB: Delete articles document
    await deleteDoc(doc(db, 'volumes', volume, 'articles', currentArticleId)) 

    // DB: Remove from edition document
    await updateDoc(doc(db, 'volumes', volume, 'editions', edition), {
      articles: articlesCopy
    })

    // DB: Remove from authors document
    const querySnapshot = await getDocs(query(collection(db, 'volumes', volume, 'authors'), where('name', '==', author)))
    const authorId = querySnapshot.docs[0].id
    const authorDocCopy = querySnapshot.docs[0].data()
    const authorArticleIndex = authorDocCopy.articles.indexOf(authorDocCopy.articles.find(elem => elem.title === title))
    authorDocCopy.articles.splice(authorArticleIndex, 1)
    await updateDoc(doc(db, 'volumes', volume, 'authors', authorId), authorDocCopy)
  }

  function onImageChange(e) {
    const file = e.target.files[0]

    setImageURL(URL.createObjectURL(file));
    setImageFile(file)
  }

  // Editing content functions
  async function editTitle() {
    const oldTitle = currentArticle.title
    
    // Update currentArticle state
    setCurrentArticle({
      ...currentArticle,
      title: title,
    })

    // Update articles state
    const articlesCopy = articles
    articlesCopy.find(x => x.title === oldTitle).title = title
    setArticles(articlesCopy)

    // Update edition document on db
    await updateDoc(doc(db, 'volumes', volume, 'editions', edition), {
      articles: articles
    })

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), {
      title: title
    })

    // Update author document on db
    const querySnapshot = await getDocs(query(collection(db, 'volumes', volume, 'authors'), where('name', '==', author)))
    const authorId = querySnapshot.docs[0].id
    const authorDocCopy = querySnapshot.docs[0].data()
    const articleIndex = authorDocCopy.articles.indexOf(authorDocCopy.articles.find(elem => elem.title === oldTitle))
    authorDocCopy.articles[articleIndex].title = title
    await updateDoc(doc(db, 'volumes', volume, 'authors', authorId), authorDocCopy)

    setTitle(null)
    setEditTitleMode(false)
  }


  // TODO: Make sure to change ID to represent new author if it is new; check at start in authors collection
  async function editAuthor() {
    const oldAuthor = currentArticle.author

    // Find author ID for new author
    const querySnapshot = await getDocs(query(collection(db, 'volumes', volume, 'authors'), where('name', '==', oldAuthor.name)))
    
    const newAuthorId = querySnapshot.docs[0].id

    // TODO: Need some way to add the article to this author's doc and remove it from the other author's doc. Is this getting too complicated?

    setCurrentArticle({
      ...currentArticle,
      author: {
        name: author,
        id: `volumes/${volume}/authors/${newAuthorId}`,
      } 
    })

    console.log(currentArticle)

    // Update articles state
    const articlesCopy = articles

    articlesCopy.find(x => x.author.name === oldAuthor.name).author.name = author
    setArticles(articlesCopy)

    // Update edition document on db
    await updateDoc(doc(db, 'volumes', volume, 'editions', edition), {
      articles: articles
    })

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), {
      author: {
        name: author,
        id: `volumes/${volume}/authors/${newAuthorId}`,
      }
    })

    setAuthor(null)
    setEditAuthorMode(false)
  }


  async function editParagraph(blockIndex) {
    // Update currentArticle
    const articleCopy = currentArticle
    articleCopy.content[blockIndex].data.text = paragraph
    setCurrentArticle(articleCopy)

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)

    setParagraph(null)
    setEditMode(null)
  }

  async function deleteParagraph(blockIndex) {
    // Update currentArticle
    const articleCopy = currentArticle
    articleCopy.content.splice(blockIndex, 1)
    setCurrentArticle(articleCopy)

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)
    setEditMode(null)
  }

  async function insertParagraph(insertIndex) {
    // Format paragraphs (if multiple entered)
    const separatedParagraphs = paragraph.split('\n')
    const formattedParagraphs = []
    separatedParagraphs.forEach(text => formattedParagraphs.push({
      data: {
        text: text
      },
      type: 'paragraph'
    }))

    // Update currentArticle
    const articleCopy = currentArticle
    const contentWithNewParagraph = [
      ...currentArticle.content.slice(0, insertIndex),
      ...formattedParagraphs,
      ...currentArticle.content.slice(insertIndex)
    ]
    articleCopy.content = contentWithNewParagraph
    setCurrentArticle(articleCopy)

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)
    
    setParagraph(null)
    setAddParagraph(null)
  }

  async function editQuote(blockIndex) {
    // Update currentArticle
    const articleCopy = currentArticle
    articleCopy.content[blockIndex].data.text = quote
    setCurrentArticle(articleCopy)

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)

    setQuote(null)
    setEditMode(null)
  }

  async function deleteQuote(blockIndex) {
    // Update currentArticle
    const articleCopy = currentArticle
    articleCopy.content.splice(blockIndex, 1)
    setCurrentArticle(articleCopy)

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)
    setEditMode(null)
  }

  async function insertQuote(insertIndex) {
    // Update currentArticle
    const articleCopy = currentArticle
    const contentWithNewQuote = [
      ...currentArticle.content.slice(0, insertIndex),
      { data: { text: quote }, type: 'quote'},
      ...currentArticle.content.slice(insertIndex)
    ]
    articleCopy.content = contentWithNewQuote
    setCurrentArticle(articleCopy)

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)
    
    setQuote(null)
    setAddQuote(null)
  }

  // TODO: Create editImage function (for now, delete and add), have ability to edit caption
  // async function editImage(blockIndex) { }

  // TODO: Change security rules so that only authorized users can access it
  async function insertImage(insertIndex) {
    const imageName = uuidv4() // Random image name (uuid)
    const imageRef = ref(storage, `noblemen/${volume}/${edition}/${currentArticleId}/${imageName}`)
    
    // Upload image to Firebase Storage
    await uploadBytes(imageRef, imageFile)
    
    // Get download URL and update article document
    const url = await getDownloadURL(imageRef)

    const articleCopy = currentArticle
    const contentWithNewQuote = [
      ...currentArticle.content.slice(0, insertIndex),
      { data: { url: url, credit: credit }, type: 'image'},
      ...currentArticle.content.slice(insertIndex)
    ]
    articleCopy.content = contentWithNewQuote
    setCurrentArticle(articleCopy)

    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)

    setImageFile(null)
    setImageURL(null)
    setCredit(null)
    setAddImage(null)
  }

  async function deleteImage(blockIndex) {
    // Delete on storage (try/catch in case image doesn't exist)
    try {
      const imageRef = ref(storage, `noblemen/${volume}/${edition}/${currentArticleId}/${currentArticle.content[blockIndex].name}`)
      await deleteObject(imageRef)
    } catch (err) {
      console.log(err)
    }

    // Update currentArticle
    const articleCopy = currentArticle
    articleCopy.content.splice(blockIndex, 1)
    setCurrentArticle(articleCopy)

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)
    
    setEditMode(null)
  }

  async function setPreviewImage(imageUrl) {
    // LOCAL: Update current article
    const articleCopy = currentArticle
    articleCopy.previewImageUrl = imageUrl
    setCurrentArticle(articleCopy)

    // LOCAL: Update articles
    const articleIndex = articles.indexOf(articles.find(elem => elem.id.path === `volumes/${volume}/articles/${currentArticleId}`))
    const articlesCopy = articles
    articlesCopy[articleIndex].previewImageUrl = imageUrl
    setArticles(articlesCopy)

    // DB: Update article document
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)

    // DB: Update editions document
    await updateDoc(doc(db, 'volumes', volume, 'editions', edition), {
      articles: articlesCopy
    })

    setEditMode(null)
  }

  async function removePreviewImage() {
      // LOCAL: Update current article
      const articleCopy = currentArticle
      articleCopy.previewImageUrl = ''
      setCurrentArticle(articleCopy)
  
      // LOCAL: Update articles
      const articleIndex = articles.indexOf(articles.find(elem => elem.id.path === `volumes/${volume}/articles/${currentArticleId}`))
      const articlesCopy = articles
      articlesCopy[articleIndex].previewImageUrl = ''
      setArticles(articlesCopy)
  
      // DB: Update article document
      await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)
  
      // DB: Update editions document
      await updateDoc(doc(db, 'volumes', volume, 'editions', edition), {
        articles: articlesCopy
      })

      setEditMode(null)
  }

  async function handlePublishToggle(checked) {
    // Update articles
    setIsPublished(checked)
    const articleIndex = articles.indexOf(articles.find(elem => elem.id.path === `volumes/${volume}/articles/${currentArticleId}`))
    const articlesCopy = articles
    articlesCopy[articleIndex].published = checked
    setArticles(articlesCopy)

    // Update article document on db
    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), {
      published: checked
    })

    // Update edition document on db
    await updateDoc(doc(db, 'volumes', volume, 'editions', edition), {
      articles: articlesCopy
    })
  }

  async function handleShowCreateModal() {
    setAuthorList([])
    const authorSnapshot = await getDocs(query(collection(db, 'volumes', volume, 'authors')))
    const authorListCopy = []
    authorSnapshot.forEach((doc) => authorListCopy.push({value: doc.data().name, label: doc.data().name, id: doc.id}))
    setAuthorList(authorListCopy)
    setShowCreateModal(true)
  }

  function handleAddClick(event, blockIndex) {
    setShowAddBlock(blockIndex)
    setTargetAddBlock(event.target)
  }

  if (!loggedIn) {
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
  } else {
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
                {articles &&  (
                  <ListGroup.Item style={{'backgroundColor': '#92e88e', 'cursor': 'pointer'}} onClick={() => handleShowCreateModal()}>
                    + Create new article
                  </ListGroup.Item>
                )}

                {/** Modal for initial article submission */}
                <Modal
                  show={showCreateModal}
                  onHide={() => setShowCreateModal(false)}
                  backdrop="static"
                  keyboard={false}
                >
                  <Modal.Header closeButton>
                    <Modal.Title>Create new article</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Title</Form.Label>
                        <Form.Control
                          type="text"
                          onChange={(e) => setTitle(e.target.value)}
                          autoFocus
                        />
                      </Form.Group>
                      <Form.Group
                        className="mb-3"
                      >
                        <Form.Label>Author</Form.Label>
                        <Select options={authorList} onChange={(e) => setAuthor(e.value)}/>
                      </Form.Group>
                    </Form>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" disabled={(title === null || title === '') || (author === null || author === '')} onClick={() => createArticle()}>Create</Button>
                  </Modal.Footer>
                </Modal>

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

                {/** TITLE */}
                {editTitleMode ? (
                  <div>
                    <Form.Control type="text" onChange={(e) => setTitle(e.target.value)} defaultValue={currentArticle.title}></Form.Control>
                    <Row className="justify-content-start mt-2 mb-2">
                      <Col md={1}>
                        <Button variant="success" onClick={() => editTitle()}>Submit</Button>
                      </Col>
                      <Col md={1} style={{'margin-left': '20px'}}>
                        <Button variant="primary" onClick={() => setEditTitleMode(false)}>Cancel</Button>
                      </Col>
                    </Row>
                  </div>
                ) : <h2 onClick={() => setEditTitleMode(true)} className="fw-bold fst-italic">{currentArticle.title}</h2>}
                
                {/** AUTHOR */}
                {editAuthorMode ? (
                  <div className="mb-3">
                    <Form.Control type="text" onChange={(e) => setAuthor(e.target.value)} defaultValue={currentArticle.author.name}></Form.Control>
                    <Row className="justify-content-start mt-2 mb-2">
                      <Col md={1}>
                        <Button variant="success" onClick={() => editAuthor()}>Submit</Button>
                      </Col>
                      <Col md={1} style={{'margin-left': '20px'}}>
                        <Button variant="primary" onClick={() => setEditAuthorMode(false)}>Cancel</Button>
                      </Col>
                    </Row>
                  </div>
                ) : <h4 onClick={() => setEditAuthorMode(true)} className="fw-normal mb-3">{currentArticle.author.name}</h4>}
                
                <Row>
                  <Col sm={1}>
                    <p>Published:</p>
                  </Col>
                  <Col sm={1} style={{'marginLeft': '20px'}}>
                    <Toggle
                    id='published_status'
                    defaultChecked={isPublished}
                    onChange={(e) => handlePublishToggle(e.target.checked)} />
                  </Col>
                </Row>
                <Col sm={1}>
                  <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Delete</Button>
                </Col>
                <Modal
                  show={showDeleteModal}
                  onHide={() => setShowDeleteModal(false)}
                  backdrop="static"
                  keyboard={false}
                >
                  <Modal.Header closeButton>
                    <Modal.Title>Are you sure you want to delete this?</Modal.Title>
                  </Modal.Header>
                  <Modal.Footer className="justify-content-center">
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" onClick={() => deleteArticle()}>Delete</Button>
                  </Modal.Footer>
                </Modal>

                {/** FIRST ADD BLOCK */}
                <Row className="add-block justify-content-center mt-2">
                  <hr></hr>
                  <Col className="add-block-button" md={1}>
                    <Overlay show={showAddBlock === 0} placement="right" target={targetAddBlock}>
                      <Popover id="popover-basic">
                        <Popover.Body>
                          <ButtonGroup>
                            <Button onClick={() => { setEditMode(null); setAddParagraph(0); setShowAddBlock(null); setTargetAddBlock(null) } }>Paragraph</Button>
                            <Button onClick={() => { setEditMode(null); setAddImage(0); setShowAddBlock(null); setTargetAddBlock(null)} }>Image</Button>
                            <Button onClick={() => { setEditMode(null); setAddQuote(0); setShowAddBlock(null); setTargetAddBlock(null)} }>Quote</Button>
                          </ButtonGroup>
                        </Popover.Body>
                      </Popover>
                    </Overlay>
                    <Button style={{'borderRadius': '50%', 'margin-top': '-60px'}} onClick={(e) => handleAddClick(e, 0)} variant="info">+</Button>                          
                  </Col>
                </Row>
                {addParagraph === 0 ? <>
                  <Form.Control as="textarea" onChange={(e) => setParagraph(e.target.value)} style={{'height': '250px'}} />
                  <Row className="mt-2 mb-3 justify-content-center">
                      <Col xs={2}>
                        <Button variant="success" onClick={() => insertParagraph(0)}>Add</Button>
                      </Col>
                      <Col xs={2}>
                        <Button variant="primary" onClick={() => setAddParagraph(null)}>Cancel</Button>
                      </Col>
                    </Row>
                </> : addQuote === 0 ? <>
                  <Form.Control as="textarea" onChange={(e) => setQuote(e.target.value)}/>
                  <Row className="mt-2 mb-3 justify-content-center">
                      <Col xs={2}>
                        <Button variant="success" onClick={() => insertQuote(0)}>Add</Button>
                      </Col>
                      <Col xs={2}>
                        <Button variant="primary" onClick={() => setAddQuote(null)}>Cancel</Button>
                      </Col>
                    </Row>
                </> : addImage === 0 && <>
                      {imageURL && <img className="img-fluid" src={imageURL} alt="Nobleman"/>}
                      <input type="file" accept="image/*" onChange={onImageChange} />
                      <Form.Control type="text" className="mt-2" placeholder="Enter credit" onChange={(e) => setCredit(e.target.value)} />
                      <Row className="mt-2 mb-3 justify-content-center">
                        <Col xs={2}>
                          <Button variant="success" onClick={() => insertImage(0)} disabled={imageURL === null || credit === (null || '')}>Add</Button>
                        </Col>
                        <Col xs={2}>
                          <Button variant="primary" onClick={() => { setAddImage(null); setImageURL(null); setImageFile(null) }}>Cancel</Button>
                        </Col>
                      </Row>
                </>}

                {/** CONTENT */}
                {currentArticle.content.map((block) => {
                  const blockIndex = currentArticle.content.indexOf(block)

                  // PARAGRAPH
                  if (block.type === "paragraph") {
                    return <div>
                      {editMode === blockIndex ? (
                        <>
                          <Form.Control as="textarea" style={{'height': '250px'}} onChange={(e) => setParagraph(e.target.value)} defaultValue={block.data.text} />
                          <Row className="mt-2 justify-content-center">
                            <Col xs={2}>
                              <Button variant="success" onClick={() => editParagraph(blockIndex)}>Submit</Button>
                            </Col>
                            <Col xs={2}>
                              <Button variant="danger" onClick={() => deleteParagraph(blockIndex)}>Delete</Button>
                            </Col>
                            <Col xs={2}>
                              <Button variant="primary" onClick={() => setEditMode(null)}>Cancel</Button>
                            </Col>
                          </Row>
                        </>
                      ) : <>
                        <p onClick={() => { setAddParagraph(null); setEditMode(blockIndex) }}>{block.data.text}</p>
                        <Row className="add-block justify-content-center mt-2">
                          <hr></hr>
                          <Col className="add-block-button" md={1}>
                            <Overlay show={showAddBlock === blockIndex + 1} placement="right" target={targetAddBlock}>
                              <Popover id="popover-basic">
                                <Popover.Body>
                                  <ButtonGroup>
                                    <Button onClick={() => { setEditMode(null); setAddParagraph(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null) } }>Paragraph</Button>
                                    <Button onClick={() => { setEditMode(null); setAddImage(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null)} }>Image</Button>
                                    <Button onClick={() => { setEditMode(null); setAddQuote(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null)} }>Quote</Button>
                                  </ButtonGroup>
                                </Popover.Body>
                              </Popover>
                            </Overlay>
                            <Button style={{'borderRadius': '50%', 'margin-top': '-60px'}} onClick={(e) => handleAddClick(e, blockIndex + 1)} variant="info">+</Button>                          
                          </Col>
                        </Row>
                        {addParagraph === blockIndex + 1 ? <>
                          <Form.Control as="textarea" style={{'height': '250px'}} onChange={(e) => setParagraph(e.target.value)}/>
                          <Row className="mt-2 mb-3 justify-content-center">
                              <Col xs={2}>
                                <Button variant="success" onClick={() => insertParagraph(blockIndex + 1)}>Add</Button>
                              </Col>
                              <Col xs={2}>
                                <Button variant="primary" onClick={() => setAddParagraph(null)}>Cancel</Button>
                              </Col>
                            </Row>
                        </> : addQuote === blockIndex + 1 ? <>
                          <Form.Control as="textarea" onChange={(e) => setQuote(e.target.value)}/>
                          <Row className="mt-2 mb-3 justify-content-center">
                              <Col xs={2}>
                                <Button variant="success" onClick={() => insertQuote(blockIndex + 1)}>Add</Button>
                              </Col>
                              <Col xs={2}>
                                <Button variant="primary" onClick={() => setAddQuote(null)}>Cancel</Button>
                              </Col>
                            </Row>
                        </> : addImage === blockIndex + 1 && <>
                              {imageURL && <img className="img-fluid" src={imageURL} alt="Nobleman"/>}
                              <input type="file" accept="image/*" onChange={onImageChange} />
                              <Form.Control type="text" className="mt-2" placeholder="Enter credit" onChange={(e) => setCredit(e.target.value)} />
                              <Row className="mt-2 mb-3 justify-content-center">
                                <Col xs={2}>
                                  <Button variant="success" onClick={() => insertImage(blockIndex + 1)} disabled={imageURL === null || credit === (null || '')}>Add</Button>
                                </Col>
                                <Col xs={2}>
                                  <Button variant="primary" onClick={() => { setAddImage(null); setImageURL(null); setImageFile(null) }}>Cancel</Button>
                                </Col>
                              </Row>
                        </>}
                      </>}
                    </div>

                    // IMAGE
                  } else if (block.type === "image") {
                    return <div>
                      {editMode === blockIndex ? (
                        <>
                          <img className="img-fluid" style={{'opacity': '0.5'}} src={block.data.url} alt="Nobleman" />
                          <p className="text-center mt-2 fst-italic"><b>Credit:</b> {block.data.credit} 
                            <span className="fw-bold" style={{'color': 'red'}}>
                              {currentArticle.previewImageUrl === block.data.url && ' [PREVIEW IMAGE]'}
                            </span>
                          </p>
                          <Row className="mt-2 mb-3 justify-content-center">
                            <Col xs={2}>
                              <Button variant="success" disabled>Change Photo</Button>
                            </Col>
                            {currentArticle.previewImageUrl === block.data.url ? (
                              <Col xs={2}>
                                <Button variant="warning" onClick={() => removePreviewImage(block.data.url)}>Remove as Preview</Button>
                              </Col>
                            ) : (
                              <Col xs={2}>
                                <Button variant="warning" onClick={() => setPreviewImage(block.data.url)}>Set as Preview</Button>
                              </Col>
                            )}
                            <Col xs={2}>
                              <Button variant="danger" onClick={() => deleteImage(blockIndex)}>Delete</Button>
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
                            <p className="text-center mt-2 fst-italic"><b>Credit:</b> {block.data.credit}
                            <span className="fw-bold" style={{'color': 'red'}}>
                              {currentArticle.previewImageUrl === block.data.url && ' [PREVIEW IMAGE]'}
                            </span></p>
                          </div>
                          <Row className="add-block justify-content-center mt-2">
                            <hr></hr>
                            <Col className="add-block-button" md={1}>
                              <Overlay show={showAddBlock === blockIndex + 1} placement="right" target={targetAddBlock}>
                                <Popover id="popover-basic">
                                  <Popover.Body>
                                    <ButtonGroup>
                                      <Button onClick={() => { setEditMode(null); setAddParagraph(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null) } }>Paragraph</Button>
                                      <Button onClick={() => { setEditMode(null); setAddImage(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null)} }>Image</Button>
                                      <Button onClick={() => { setEditMode(null); setAddQuote(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null)} }>Quote</Button>
                                    </ButtonGroup>
                                  </Popover.Body>
                                </Popover>
                              </Overlay>
                              <Button style={{'borderRadius': '50%', 'margin-top': '-60px'}} onClick={(e) => handleAddClick(e, blockIndex + 1)} variant="info">+</Button>                          
                            </Col>
                          </Row>
                          {addParagraph === blockIndex + 1 ? <>
                            <Form.Control as="textarea" style={{'height': '250px'}} onChange={(e) => setParagraph(e.target.value)}/>
                            <Row className="mt-2 mb-3 justify-content-center">
                                <Col xs={2}>
                                  <Button variant="success" onClick={() => insertParagraph(blockIndex + 1)}>Add</Button>
                                </Col>
                                <Col xs={2}>
                                  <Button variant="primary" onClick={() => setAddParagraph(null)}>Cancel</Button>
                                </Col>
                              </Row>
                          </> : addQuote === blockIndex + 1 ? <>
                            <Form.Control as="textarea" onChange={(e) => setQuote(e.target.value)}/>
                            <Row className="mt-2 mb-3 justify-content-center">
                                <Col xs={2}>
                                  <Button variant="success" onClick={() => insertQuote(blockIndex + 1)}>Add</Button>
                                </Col>
                                <Col xs={2}>
                                  <Button variant="primary" onClick={() => setAddQuote(null)}>Cancel</Button>
                                </Col>
                              </Row>
                          </> : addImage === blockIndex + 1 && <>
                                {imageURL && <img className="img-fluid" src={imageURL} alt="Nobleman"/>}
                                <input type="file" accept="image/*" onChange={onImageChange} />
                                <Form.Control type="text" className="mt-2" placeholder="Enter credit" onChange={(e) => setCredit(e.target.value)} />
                                <Row className="mt-2 mb-3 justify-content-center">
                                  <Col xs={2}>
                                    <Button variant="success" onClick={() => insertImage(blockIndex + 1)} disabled={imageURL === null || credit === (null || '')}>Add</Button>
                                  </Col>
                                  <Col xs={2}>
                                    <Button variant="primary" onClick={() => { setAddImage(null); setImageURL(null); setImageFile(null) }}>Cancel</Button>
                                  </Col>
                                </Row>
                          </>}
                        </>
                      )}
                    </div>

                    // QUOTE
                  } else if (block.type === "quote") {
                    return <div>
                      {editMode === blockIndex ? (
                        <>
                          <Form.Control as="textarea" defaultValue={block.data.text} onChange={(e) => setQuote(e.target.value)} />
                          <Row className="mt-2 mb-3 justify-content-center">
                              <Col xs={2}>
                                <Button variant="success" onClick={() => editQuote(blockIndex)}>Submit</Button>
                              </Col>
                              <Col xs={2}>
                                <Button variant="danger" onClick={() => deleteQuote(blockIndex)}>Delete</Button>
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
                              <Overlay show={showAddBlock === blockIndex + 1} placement="right" target={targetAddBlock}>
                                <Popover id="popover-basic">
                                  <Popover.Body>
                                    <ButtonGroup>
                                      <Button onClick={() => { setEditMode(null); setAddParagraph(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null) } }>Paragraph</Button>
                                      <Button onClick={() => { setEditMode(null); setAddImage(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null)} }>Image</Button>
                                      <Button onClick={() => { setEditMode(null); setAddQuote(blockIndex + 1); setShowAddBlock(null); setTargetAddBlock(null)} }>Quote</Button>
                                    </ButtonGroup>
                                  </Popover.Body>
                                </Popover>
                              </Overlay>
                              <Button style={{'borderRadius': '50%', 'margin-top': '-60px'}} onClick={(e) => handleAddClick(e, blockIndex + 1)} variant="info">+</Button>                          
                            </Col>
                          </Row>
                          {addParagraph === blockIndex + 1 ? <>
                            <Form.Control as="textarea" style={{'height': '250px'}} onChange={(e) => setParagraph(e.target.value)}/>
                            <Row className="mt-2 mb-3 justify-content-center">
                                <Col xs={2}>
                                  <Button variant="success" onClick={() => insertParagraph(blockIndex + 1)}>Add</Button>
                                </Col>
                                <Col xs={2}>
                                  <Button variant="primary" onClick={() => setAddParagraph(null)}>Cancel</Button>
                                </Col>
                              </Row>
                          </> : addQuote === blockIndex + 1 ? <>
                            <Form.Control as="textarea" onChange={(e) => setQuote(e.target.value)}/>
                            <Row className="mt-2 mb-3 justify-content-center">
                                <Col xs={2}>
                                  <Button variant="success" onClick={() => insertQuote(blockIndex + 1)}>Add</Button>
                                </Col>
                                <Col xs={2}>
                                  <Button variant="primary" onClick={() => setAddQuote(null)}>Cancel</Button>
                                </Col>
                              </Row>
                          </> : addImage === blockIndex + 1 && <>
                                {imageURL && <img className="img-fluid" src={imageURL} alt="Nobleman"/>}
                                <input type="file" accept="image/*" onChange={onImageChange} />
                                <Form.Control type="text" className="mt-2" placeholder="Enter credit" onChange={(e) => setCredit(e.target.value)} />
                                <Row className="mt-2 mb-3 justify-content-center">
                                  <Col xs={2}>
                                    <Button variant="success" onClick={() => insertImage(blockIndex + 1)} disabled={imageURL === null || credit === (null || '')}>Add</Button>
                                  </Col>
                                  <Col xs={2}>
                                    <Button variant="primary" onClick={() => { setAddImage(null); setImageURL(null); setImageFile(null) }}>Cancel</Button>
                                  </Col>
                                </Row>
                          </>}
                        </>}
                    </div>
                  } else return null
                })}
              </Row>
            )}
          </Col>
        </Row>
      </Container>
    )
  }
}

export default App;
