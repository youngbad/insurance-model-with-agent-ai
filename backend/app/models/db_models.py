import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    input_data = relationship("InsuranceInput", back_populates="session", uselist=False)
    chat_messages = relationship("ChatMessage", back_populates="session")


class InsuranceInput(Base):
    __tablename__ = "insurance_inputs"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # General Information
    company_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    country = Column(String, nullable=True)
    revenue = Column(Float, nullable=True)
    num_employees = Column(Integer, nullable=True)

    # Historical Experience
    past_claims_count = Column(Integer, nullable=True)
    total_claim_value = Column(Float, nullable=True)
    loss_ratio = Column(Float, nullable=True)
    claim_frequency = Column(Float, nullable=True)

    # Exposure
    assets_value = Column(Float, nullable=True)
    locations = Column(Integer, nullable=True)
    risk_categories = Column(JSON, nullable=True)
    operational_complexity_score = Column(Float, nullable=True)

    # Derived Metrics
    risk_score = Column(Float, nullable=True)
    suggested_premium = Column(Float, nullable=True)
    risk_explanation = Column(Text, nullable=True)

    session = relationship("Session", back_populates="input_data")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="chat_messages")
