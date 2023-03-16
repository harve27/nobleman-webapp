import React, { useState } from 'react'
import { db, storage } from './firebase'
import { Row, Col, Form, Button, Overlay, Popover, ButtonGroup } from "react-bootstrap"
import { doc, updateDoc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'


export default function AddBlock({ blockIndex, currentArticle, setCurrentArticle, currentArticleId, volume, edition,
  paragraph, setParagraph, quote, setQuote, setEditMode }) {

  const [showAddBlock, setShowAddBlock] = useState(null)
  const [targetAddBlock, setTargetAddBlock] = useState(null)

  const [credit, setCredit] = useState(null)
  const [caption, setCaption] = useState(null)

  const [addImage, setAddImage] = useState(null)
  const [addParagraph, setAddParagraph] = useState(null)
  const [addQuote, setAddQuote] = useState(null)


  const [imageURL, setImageURL] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  function handleAddClick(event, blockIndex) {
      setShowAddBlock(blockIndex)
      setTargetAddBlock(event.target)
  }

  function onImageChange(e) {
      const file = e.target.files[0]
      setImageURL(URL.createObjectURL(file));
      setImageFile(file)
  }

  // TODO: Change security rules so that only authorized users can access it
  async function insertImage(insertIndex) {
    const imageName = uuidv4() // Random image name (uuid)
    const imageRef = ref(storage, `noblemen/${volume}/${edition}/${currentArticleId}/${imageName}`)
    
    // Upload image to Firebase Storage
    await uploadBytes(imageRef, imageFile)
    
    // Get download URL and update article document
    const url = await getDownloadURL(imageRef)

    const articleCopy = currentArticle
    let contentWithNewImage
    if (caption === null || caption === "") {
    contentWithNewImage = [
        ...currentArticle.content.slice(0, insertIndex),
        { data: { url: url, credit: credit, }, type: 'image'},
        ...currentArticle.content.slice(insertIndex)
    ]
    } else {
    contentWithNewImage = [
        ...currentArticle.content.slice(0, insertIndex),
        { data: { url: url, credit: credit, caption: caption, }, type: 'image'},
        ...currentArticle.content.slice(insertIndex)
    ]
    }

    articleCopy.content = contentWithNewImage
    setCurrentArticle(articleCopy)

    await updateDoc(doc(db, 'volumes', volume, 'articles', currentArticleId), currentArticle)

    setImageFile(null)
    setImageURL(null)
    setCredit(null)
    setCaption(null)
    setAddImage(null)
  }

  async function insertParagraph(insertIndex) {
    // Format paragraphs (if multiple entered)
    let separatedParagraphs = paragraph.split('\n')
    separatedParagraphs = separatedParagraphs.filter(paragraph => paragraph !== "")
    const formattedParagraphs = []
    separatedParagraphs.forEach(text => {
      let formattedText
      if (text.startsWith("\t")) formattedText = text.slice(1)
      else formattedText = text
      formattedParagraphs.push({
        data: {
          text: formattedText
        },
        type: 'paragraph'
      })
    })

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

  return (
    <>
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
            <Form.Control type="text" className="mt-2" placeholder="Enter caption" onChange={(e) => setCaption(e.target.value)} />
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
  )
}




