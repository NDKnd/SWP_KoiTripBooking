import React, { useState, useEffect } from "react";
import { Layout, Row, Col, Card, Spin, message, Tag, Steps, Button, Modal, Input, Rate } from "antd";
import { UploadOutlined, CloseCircleOutlined } from "@ant-design/icons";
import api from "../../services/axios";
import Header from "../../Components/Header/Header";
import Footer from "../../Components/Footer/Footers";
import { useLocation } from "react-router-dom";
import "../Trip/BookingStatusPage.css";
import upFile from "../../utils/file";
import storage from "../../config/firebase";
import { deleteObject, ref } from "firebase/storage";

const { Content } = Layout;

const statusColors = {
  PENDING_CONFIRMATION: "orange",
  AWAITING_PAYMENT: "blue",
  IN_PROGRESS: "green",
  CHECK_IN: "purple",
  COMPLETED: "green",
  CANCELED: "red",
};

function BookingStatusPage() {
  const [booking, setBooking] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const location = useLocation();

  useEffect(() => {

    const fetchTransactions = async (id) => {
      console.log("id: ", id)
      try {
        const response = await api.post("transaction/booking?bookingId=" + id);
        console.log("res transaction: ", response.data)
      } catch (error) {
        console.error("Error transaction orders:", error)
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const vnp_ResponseCode = urlParams.get('vnp_ResponseCode');
    const bookID = urlParams.get('bookingId');
    console.log(vnp_ResponseCode + "-" + bookID)
    if (vnp_ResponseCode != null && bookID != null) {
      if (vnp_ResponseCode === '00') {
        fetchTransactions(bookID);
      }
    }

    const fetchBookingData = async (bookingId) => {
      try {
        const bookingResponse = await api.get(`/booking/customer`);
        const bookingData = bookingResponse.data;

        if (bookingData && bookingData.length > 0) {
          const storedBookingId = bookingId || localStorage.getItem("bookingId");
          let specificBooking;

          if (storedBookingId) {
            specificBooking = bookingData.find((b) => b.id === parseInt(storedBookingId));
            setBooking(specificBooking || bookingData[0]);
          } else {
            bookingData.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
            setBooking(bookingData[0]);
          }
          if (specificBooking) localStorage.setItem("bookingId", specificBooking.id);
          handleCheckFeedback(specificBooking ? specificBooking.id : bookingData[0].id);
        } else {
          console.error("No booking found.");
        }
      } catch (error) {
        console.error("Error fetching booking data:", error);
      } finally {
        setLoading(false);
      }
    };

    const checkPaymentStatus = async () => {
      const queryParams = new URLSearchParams(location.search);
      const transactionStatus = queryParams.get("vnp_TransactionStatus");
      const bookingId = queryParams.get("bookingId");

      if (transactionStatus === "00" && bookingId) {
        try {
          await api.put(`/booking/status/${bookingId}`, {
            status: "IN_PROGRESS",
          });
        } catch (error) {
          console.error("Error updating booking status:", error);
        }
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    const queryParams = new URLSearchParams(location.search);
    const bookingId = queryParams.get("bookingId");

    fetchBookingData(bookingId);
    checkPaymentStatus();
  }, [location]);

  const getCurrentStep = (status) => {
    const statusIndex = {
      PENDING_CONFIRMATION: 0,
      AWAITING_PAYMENT: 1,
      IN_PROGRESS: 2,
      CHECK_IN: 3,
      COMPLETED: 4,
      CANCELED: 5,
    };
    return statusIndex[status] || 0;
  };

  const handleUploadChange = async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setUploadedImage(reader.result);
    };
    setFile(file);
    console.log("image : ", file);
  };

  const handleCheckIn = async () => {

    const downloadURL = await upFile(file, `Bookings/${booking.id}`); // Tải file lên Firebase

    if (downloadURL) {
      // Cập nhật booking với URL của ảnh checkin
      booking.image = downloadURL;
      console.log("checkIn.image: ", downloadURL);
      try {
        const res = await api.put(`booking/check-in/${booking.id}`,
          {
            image: downloadURL
          }
        );
        const res2 = await api.put(`booking/status/${booking.id}`, {
          status: "CHECK_IN",
        })
        console.log("res: ", res.data);
        console.log("res2: ", res2.data);
        refreshPage();
      } catch (error) {
        deleteFile(downloadURL);
        console.log(error);
      }
    }
    setFile(null);
  };
  const deleteFile = async (url) => {
    if (url) {
      const ImageRef = ref(storage, url);
      await deleteObject(ImageRef);
    }
  };

  const handleCheckout = () => {
    api.post(`/booking/payment`, { id: booking.id })
      .then((response) => {
        if (response.data) {
          window.location.href = response.data;
        } else {
          console.error("Failed to retrieve payment link.");
        }
      })
      .catch((error) => {
        console.error("Error during checkout:", error);
      });
  };

  const handleCancel = async () => {
    try {
      await api.put(`/booking/status/${booking.id}`, {
        status: "CANCEL",
      });
      setBooking((prevBooking) => ({ ...prevBooking, status: "CANCELED" }));
    } catch (error) {
      console.error("Error canceling booking:", error);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      message.error("Please enter feedback before submitting.");
      return;
    }
    if (rating < 1) {
      message.error("Please select a rating before submitting.");
      return;
    }

    try {
      await api.post(`/feedback`,
        {
          rating: rating.toString(),
          comment: feedback,
          bookingId: booking.id.toString(),
        }
      );
      message.success("Thank you for your feedback!");
      setFeedback("");
      setRating(0);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  const handleCheckFeedback = async (bookingid) => {
    try {
      const response = await api.get(`/feedback`);
      const feedbackData = response.data;
      console.log("feedback lsit:", response.data);
      const existingFeedback = feedbackData.find(
        (feedback) => feedback.booking ? bookingid === feedback.booking.id : null
      );
      if (existingFeedback) {
        setExistingFeedback(existingFeedback);
      }
    } catch (error) {
      console.error("Error checking feedback:", error);
    }
  };

  function refreshPage() {
    window.location.reload(false);
  }

  return (
    <Layout>
      <Header />
      <Content className="layout">
        <h2 className="trip-status-title">My Trip Status</h2>
        {loading ? (
          <Spin tip="Loading booking status..." />
        ) : booking ? (
          <>
            <Steps current={getCurrentStep(booking.status)}>
              <Steps.Step
                title="Pending Confirmation"
                description={booking.status === "CANCEL"}
                icon={booking.status === "CANCEL" ? <CloseCircleOutlined style={{ color: "red" }} /> : undefined}
              />
              <Steps.Step
                title="Awaiting Payment"
                description={booking.status === "CANCEL"}
                icon={booking.status === "CANCEL" ? <CloseCircleOutlined style={{ color: "red" }} /> : undefined}
              />
              <Steps.Step
                title="In Progress"
                description={booking.status === "CANCEL"}
                icon={booking.status === "CANCEL" ? <CloseCircleOutlined style={{ color: "red" }} /> : undefined}
              />
              <Steps.Step
                title="Check In"
                description={booking.status === "CANCEL"}
                icon={booking.status === "CANCEL" ? <CloseCircleOutlined style={{ color: "red" }} /> : undefined}
              />
              <Steps.Step
                title="Completed"
                description={booking.status === "CANCEL"}
                icon={booking.status === "CANCEL" ? <CloseCircleOutlined style={{ color: "red" }} /> : undefined}
              />
              {booking.status === "CANCEL" && (
                <Steps.Step
                  title="Canceled"
                  status="error"
                />
              )}
            </Steps>
            <Row gutter={[16, 16]} style={{ marginTop: "20px" }}>
              <Col xs={24} md={12}>
                <Card
                  title="Trip and Farm Information"
                  className="information-card"
                  bordered
                >
                  <div style={{ marginBottom: "24px" }}>
                    <h3>Trip Information</h3>
                    <p><strong>Start Date:</strong> {booking.trip.startDate}</p>
                    <p><strong>End Date:</strong> {booking.trip.endDate}</p>
                    <p><strong>Start Location:</strong> {booking.trip.startLocation}</p>
                    <p><strong>End Location:</strong> {booking.trip.endLocation}</p>
                  </div>
                  <h3>Farm Information</h3>
                  {booking.trip.farms && booking.trip.farms.length > 0 ? (
                    booking.trip.farms.map((farm, index) => (
                      <div key={farm.id}>
                        <p><strong>Farm No {index + 1}</strong></p>
                        <p><strong>Name:</strong> {farm.farmName}</p>
                        <p><strong>Location:</strong> {farm.location}</p>
                        <p><strong>Phone:</strong> {farm.phone}</p>
                        <p><strong>Email:</strong> {farm.email}</p>
                      </div>
                    ))
                  ) : (
                    <p>No farms selected for this trip.</p>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Booking Information" className="information-card" bordered>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px" }}>
                    <span><strong>Booking ID:</strong></span>
                    <span>{booking.id}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px" }}>
                    <span><strong>Booking Date:</strong></span>
                    <span>{new Date(booking.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px" }}>
                    <span><strong>Status:</strong></span>
                    <Tag color={statusColors[booking.status]}>
                      {booking.status.replace("_", " ")}
                    </Tag>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px" }}>
                    <span><strong>Total Price:</strong></span>
                    <span>{booking.totalPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND</span>
                  </div>
                  <p><strong>Note:</strong> {booking.note}</p>

                  {booking.status === "AWAITING_PAYMENT" && (
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "10px" }}>
                      <Button className="checkout-button" type="primary" onClick={handleCheckout}>
                        Check Out
                      </Button>
                    </div>
                  )}

                  {booking.status !== "CANCEL" && booking.status !== "COMPLETED" && (
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "10px" }}>
                      <Button className="cancel-button" type="primary" onClick={() => {
                        handleCancel();
                        refreshPage();
                      }}>
                        Cancel
                      </Button>
                    </div>
                  )}
                  {(booking.status === "COMPLETED" || booking.status === "CANCEL") && (
                    <Card title="Feedback" className="feedback-card" bordered>
                      {existingFeedback ? (
                        <>
                          <p><strong>Rating:</strong> <Rate disabled value={existingFeedback.rating} /></p>
                          <p><strong>Date:</strong> {new Date(existingFeedback.createAt).toLocaleString()}</p>
                          <p><strong>Comment:</strong> {existingFeedback.comment}</p>
                        </>
                      ) : (
                        <>
                          <p>Rate your experience:</p>
                          <Rate value={rating} onChange={setRating} />
                          <Input.TextArea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Please leave your feedback here"
                            rows={4}
                          />
                          <Button
                            type="primary"
                            onClick={() => {
                              handleFeedbackSubmit();
                              refreshPage();
                            }}
                            style={{ marginTop: "10px" }}
                          >
                            Submit
                          </Button>
                        </>
                      )}
                    </Card>
                  )}
                </Card>
              </Col>
            </Row>
            {["IN_PROGRESS", "CHECK_IN"].includes(booking.status) && (
              <Row style={{ marginTop: "20px" }}>
                <Col xs={24}>
                  {!booking.image ? (
                    <Card title="Upload Ticket Image" bordered>
                      <input type="file" onChange={(e) => handleUploadChange(e)} />
                      {uploadedImage && (
                        <div className="uploaded-image-container">
                          <div className="upload-btn">
                            <img className="ticket-img" src={uploadedImage} alt="Uploaded" />
                          </div>
                          <div className="upload-btn">
                            <Button
                              icon={<UploadOutlined />}
                              style={{
                                width: "200%",
                                fontSize: "20px",
                              }}
                              type="primary"
                              onClick={() => {
                                Modal.confirm({
                                  title: "Check in",
                                  content: "Are you sure you want to check in?",
                                  onOk: () => {
                                    handleCheckIn();
                                  },
                                })
                              }}
                            >
                              Submit Check In
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                    : (
                      <Card title="Uploaded Ticket Image" bordered>
                        <img className="ticket-img" src={booking.image} alt="Uploaded" />
                      </Card>
                    )
                  }
                </Col>
              </Row>
            )}
          </>
        ) : (
          <p>No trip status available.</p>
        )}
      </Content>
      <Footer />
    </Layout>
  );
}

export default BookingStatusPage;
